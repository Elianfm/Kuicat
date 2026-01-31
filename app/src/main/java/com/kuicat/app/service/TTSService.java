package com.kuicat.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio para Text-to-Speech usando Kokoro vía Replicate API.
 * Modelo: jaaari/kokoro-82m
 * Costo: ~$0.00022 por generación
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TTSService {
    
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;
    
    private static final String REPLICATE_API_KEY = "replicate_api_key";
    private static final String REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
    private static final String KOKORO_MODEL = "jaaari/kokoro-82m";
    private static final String KOKORO_VERSION = "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13";
    
    // Timeout para polling
    private static final int MAX_POLL_ATTEMPTS = 30; // 30 intentos
    private static final int POLL_INTERVAL_MS = 1000; // 1 segundo
    
    /**
     * Genera audio TTS para el texto dado.
     * 
     * @param text Texto a convertir a voz
     * @param voice ID de la voz (ej: "af_bella", "am_michael")
     * @param speed Velocidad (0.5 - 2.0, default 1.0)
     * @return TTSResult con URL del audio y duración, o empty si falla
     */
    public Optional<TTSResult> generateSpeech(String text, String voice, Double speed) {
        Optional<String> apiKeyOpt = settingsService.getSetting(REPLICATE_API_KEY);
        
        if (apiKeyOpt.isEmpty() || apiKeyOpt.get().isBlank()) {
            log.warn("No hay API key de Replicate configurada");
            return Optional.empty();
        }
        
        String apiKey = apiKeyOpt.get();
        
        // Reintentar hasta 3 veces en caso de error de conexión
        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++) {
            try {
                if (retry > 0) {
                    log.info("TTS reintento {} de {}", retry + 1, maxRetries);
                    Thread.sleep(2000); // Esperar 2 segundos antes de reintentar
                }
                
                // 1. Crear predicción
                String predictionId = createPrediction(apiKey, text, voice, speed != null ? speed : 1.0);
                
                if (predictionId == null) {
                    log.error("No se pudo crear la predicción TTS");
                    continue; // Reintentar
                }
                
                log.debug("Predicción TTS creada: {}", predictionId);
                
                // 2. Polling hasta completar
                Optional<TTSResult> result = pollForResult(apiKey, predictionId);
                if (result.isPresent()) {
                    return result;
                }
                // Si no hay resultado, reintentar
                
            } catch (Exception e) {
                log.error("Error en TTS (intento {}): {}", retry + 1, e.getMessage());
                if (retry == maxRetries - 1) {
                    log.error("TTS falló después de {} intentos", maxRetries);
                }
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Genera audio TTS con configuración por defecto (velocidad 1.0).
     */
    public Optional<TTSResult> generateSpeech(String text, String voice) {
        return generateSpeech(text, voice, 1.0);
    }
    
    private String createPrediction(String apiKey, String text, String voice, double speed) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
        
        // Cuerpo de la petición
        Map<String, Object> input = Map.of(
            "text", text,
            "voice", voice,
            "speed", speed
        );
        
        Map<String, Object> body = Map.of(
            "version", KOKORO_VERSION,
            "input", input
        );
        
        String jsonBody = objectMapper.writeValueAsString(body);
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(REPLICATE_API_URL))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Prefer", "wait=5") // Esperar hasta 5 segundos antes de responder
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 201 && response.statusCode() != 200) {
            log.error("Error creando predicción TTS. Status: {}, Body: {}", 
                response.statusCode(), response.body());
            return null;
        }
        
        JsonNode json = objectMapper.readTree(response.body());
        
        // Si ya está completo (modo sync con Prefer: wait)
        String status = json.path("status").asText();
        if ("succeeded".equals(status)) {
            // Extraer resultado directamente
            return json.path("id").asText();
        }
        
        return json.path("id").asText();
    }
    
    private Optional<TTSResult> pollForResult(String apiKey, String predictionId) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
        
        String pollUrl = REPLICATE_API_URL + "/" + predictionId;
        
        for (int attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(pollUrl))
                .header("Authorization", "Bearer " + apiKey)
                .GET()
                .build();
            
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() != 200) {
                log.error("Error polling TTS. Status: {}", response.statusCode());
                return Optional.empty();
            }
            
            JsonNode json = objectMapper.readTree(response.body());
            String status = json.path("status").asText();
            
            log.debug("TTS status: {} (intento {})", status, attempt + 1);
            
            switch (status) {
                case "succeeded":
                    // Extraer URL del audio
                    JsonNode output = json.path("output");
                    String audioUrl;
                    
                    if (output.isTextual()) {
                        audioUrl = output.asText();
                    } else if (output.isArray() && output.size() > 0) {
                        audioUrl = output.get(0).asText();
                    } else {
                        log.error("Formato de output inesperado: {}", output);
                        return Optional.empty();
                    }
                    
                    // Calcular duración aproximada (Kokoro no devuelve duración directamente)
                    // Estimamos ~10 caracteres por segundo de audio
                    double estimatedDuration = Math.max(1.0, json.path("input").path("text").asText().length() / 15.0);
                    
                    // Intentar obtener métricas si están disponibles
                    JsonNode metrics = json.path("metrics");
                    if (metrics.has("predict_time")) {
                        // No es la duración del audio, pero es una referencia
                        log.debug("Predict time: {} s", metrics.path("predict_time").asDouble());
                    }
                    
                    log.info("TTS generado: {} (duración estimada: {}s)", audioUrl, estimatedDuration);
                    
                    return Optional.of(new TTSResult(audioUrl, estimatedDuration));
                    
                case "failed":
                    String error = json.path("error").asText();
                    log.error("TTS falló: {}", error);
                    return Optional.empty();
                    
                case "canceled":
                    log.warn("TTS cancelado");
                    return Optional.empty();
                    
                case "starting":
                case "processing":
                    // Esperar y reintentar
                    Thread.sleep(POLL_INTERVAL_MS);
                    break;
                    
                default:
                    log.warn("Estado TTS desconocido: {}", status);
                    Thread.sleep(POLL_INTERVAL_MS);
            }
        }
        
        log.error("TTS timeout después de {} intentos", MAX_POLL_ATTEMPTS);
        return Optional.empty();
    }
    
    /**
     * Resultado de TTS con URL del audio y duración estimada.
     */
    public record TTSResult(String audioUrl, Double duration) {}
}
