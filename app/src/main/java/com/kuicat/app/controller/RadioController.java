package com.kuicat.app.controller;

import com.kuicat.app.dto.*;
import com.kuicat.app.service.RadioScriptService;
import com.kuicat.app.service.RadioService;
import com.kuicat.app.service.TTSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controlador para el Modo Radio IA.
 */
@RestController
@RequestMapping("/api/radio")
@RequiredArgsConstructor
@Slf4j
public class RadioController {
    
    private final RadioService radioService;
    private final RadioScriptService radioScriptService;
    private final TTSService ttsService;
    
    // Cache para audios descargados (evita re-descargar)
    private final Map<String, byte[]> audioCache = new ConcurrentHashMap<>();
    
    /**
     * Obtiene la configuración actual del radio.
     */
    @GetMapping("/config")
    public ResponseEntity<RadioConfigDTO> getConfig() {
        return ResponseEntity.ok(radioService.getConfig());
    }
    
    /**
     * Actualiza la configuración del radio.
     */
    @PutMapping("/config")
    public ResponseEntity<RadioConfigDTO> updateConfig(@RequestBody RadioConfigDTO dto) {
        return ResponseEntity.ok(radioService.updateConfig(dto));
    }
    
    /**
     * Activa o desactiva el modo radio.
     */
    @PostMapping("/toggle")
    public ResponseEntity<RadioConfigDTO> toggleRadio() {
        return ResponseEntity.ok(radioService.toggleEnabled());
    }
    
    /**
     * Resetea la memoria de la sesión de radio.
     * Útil si el usuario quiere empezar una nueva narrativa sin desactivar/activar.
     */
    @PostMapping("/reset-memory")
    public ResponseEntity<Map<String, String>> resetMemory() {
        radioService.resetMemory();
        log.info("Memoria de radio reseteada manualmente");
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Memory reset successfully"));
    }
    
    /**
     * Obtiene las voces disponibles para TTS.
     */
    @GetMapping("/voices")
    public ResponseEntity<List<Map<String, String>>> getAvailableVoices() {
        // Voces de Kokoro TTS - solo inglés (American y British)
        List<Map<String, String>> voices = List.of(
            // American English - Female
            Map.of("id", "af_bella", "name", "Bella", "gender", "female", "accent", "American", "quality", "A"),
            Map.of("id", "af_nicole", "name", "Nicole", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_nova", "name", "Nova", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_sarah", "name", "Sarah", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_sky", "name", "Sky", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_alloy", "name", "Alloy", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_aoede", "name", "Aoede", "gender", "female", "accent", "American", "quality", "B"),
            Map.of("id", "af_kore", "name", "Kore", "gender", "female", "accent", "American", "quality", "B"),
            
            // American English - Male
            Map.of("id", "am_michael", "name", "Michael", "gender", "male", "accent", "American", "quality", "B"),
            Map.of("id", "am_fenrir", "name", "Fenrir", "gender", "male", "accent", "American", "quality", "B"),
            Map.of("id", "am_puck", "name", "Puck", "gender", "male", "accent", "American", "quality", "B"),
            Map.of("id", "am_adam", "name", "Adam", "gender", "male", "accent", "American", "quality", "D"),
            Map.of("id", "am_echo", "name", "Echo", "gender", "male", "accent", "American", "quality", "C"),
            Map.of("id", "am_eric", "name", "Eric", "gender", "male", "accent", "American", "quality", "C"),
            Map.of("id", "am_liam", "name", "Liam", "gender", "male", "accent", "American", "quality", "C"),
            Map.of("id", "am_onyx", "name", "Onyx", "gender", "male", "accent", "American", "quality", "C"),
            
            // British English - Female
            Map.of("id", "bf_emma", "name", "Emma", "gender", "female", "accent", "British", "quality", "A"),
            Map.of("id", "bf_alice", "name", "Alice", "gender", "female", "accent", "British", "quality", "C"),
            Map.of("id", "bf_isabella", "name", "Isabella", "gender", "female", "accent", "British", "quality", "B"),
            Map.of("id", "bf_lily", "name", "Lily", "gender", "female", "accent", "British", "quality", "C"),
            
            // British English - Male
            Map.of("id", "bm_george", "name", "George", "gender", "male", "accent", "British", "quality", "B"),
            Map.of("id", "bm_fable", "name", "Fable", "gender", "male", "accent", "British", "quality", "B"),
            Map.of("id", "bm_daniel", "name", "Daniel", "gender", "male", "accent", "British", "quality", "C"),
            Map.of("id", "bm_lewis", "name", "Lewis", "gender", "male", "accent", "British", "quality", "C")
        );
        
        return ResponseEntity.ok(voices);
    }
    
    /**
     * Obtiene los presets de personalidad disponibles.
     */
    @GetMapping("/personalities")
    public ResponseEntity<List<Map<String, String>>> getPersonalities() {
        List<Map<String, String>> personalities = List.of(
            Map.of("id", "energetic", "name", "Energetic DJ", "description", "Upbeat, enthusiastic, uses exclamations!"),
            Map.of("id", "classic", "name", "Classic Host", "description", "Deep voice, formal, professional"),
            Map.of("id", "casual", "name", "Casual Friend", "description", "Relaxed, conversational, friendly"),
            Map.of("id", "critic", "name", "Music Critic", "description", "Shares fun facts, analyzes songs"),
            Map.of("id", "nostalgic", "name", "Nostalgic Host", "description", "Emotional, reminisces about memories"),
            Map.of("id", "custom", "name", "Custom", "description", "Define your own personality")
        );
        
        return ResponseEntity.ok(personalities);
    }
    
    /**
     * Genera un anuncio de radio con TTS.
     * Este es el endpoint principal que el frontend llama cuando es momento de un anuncio.
     */
    @PostMapping("/generate")
    public ResponseEntity<RadioAnnouncementDTO> generateAnnouncement(@RequestBody RadioContextDTO context) {
        log.info("Generando anuncio de radio...");
        
        RadioConfigDTO config = radioService.getConfig();
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            log.warn("Radio mode no está activo");
            return ResponseEntity.badRequest().build();
        }
        
        // Registrar canción anterior en el historial
        if (context.getPreviousTitle() != null) {
            radioService.addSongToHistory(context.getPreviousTitle(), context.getPreviousArtist());
        }
        
        // Generar identidad de sesión si es necesario
        if (radioService.needsIdentityGeneration()) {
            log.info("Generando identidad de sesión...");
            var identityOpt = radioScriptService.generateSessionIdentity(context.getUpcomingSongs());
            identityOpt.ifPresent(radioService::setSessionIdentity);
        }
        
        boolean isDualMode = radioService.isDualMode();
        String[] voices = radioService.getVoices();
        
        try {
            if (isDualMode && voices.length == 2) {
                return generateDualAnnouncement(context, voices);
            } else {
                return generateSingleAnnouncement(context, voices[0]);
            }
        } catch (Exception e) {
            log.error("Error generando anuncio: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private ResponseEntity<RadioAnnouncementDTO> generateSingleAnnouncement(
            RadioContextDTO context, String voice) {
        
        // 1. Generar script con LLM
        Optional<String> scriptOpt = radioScriptService.generateScript(context);
        
        if (scriptOpt.isEmpty()) {
            log.error("No se pudo generar el script");
            return ResponseEntity.internalServerError().build();
        }
        
        String script = scriptOpt.get();
        
        // 2. Generar audio con TTS
        Optional<TTSService.TTSResult> ttsOpt = ttsService.generateSpeech(script, voice);
        
        if (ttsOpt.isEmpty()) {
            log.error("No se pudo generar el TTS");
            return ResponseEntity.internalServerError().build();
        }
        
        TTSService.TTSResult tts = ttsOpt.get();
        
        // 3. Calcular parámetros de transición
        TransitionParamsDTO transition = radioService.calculateTransition(tts.duration());
        
        // 4. Construir respuesta
        RadioAnnouncementDTO response = RadioAnnouncementDTO.builder()
            .audioUrl(tts.audioUrl())
            .duration(tts.duration())
            .script(script)
            .transition(transition)
            .build();
        
        log.info("Anuncio generado exitosamente. Duración: {}s", tts.duration());
        
        return ResponseEntity.ok(response);
    }
    
    private ResponseEntity<RadioAnnouncementDTO> generateDualAnnouncement(
            RadioContextDTO context, String[] voices) {
        
        // 1. Generar script dual con LLM (devuelve array de líneas)
        Optional<String[]> scriptsOpt = radioScriptService.generateDualScript(context);
        
        if (scriptsOpt.isEmpty()) {
            log.error("No se pudo generar el script dual");
            return ResponseEntity.internalServerError().build();
        }
        
        String[] lines = scriptsOpt.get();
        
        // 2. Generar TTS para cada línea (máximo 3 líneas)
        // Las líneas alternan: HOST1, HOST2, HOST1
        List<TTSService.TTSResult> ttsResults = new ArrayList<>();
        List<String> audioUrls = new ArrayList<>();
        StringBuilder combinedScript = new StringBuilder();
        double totalDuration = 0;
        
        for (int i = 0; i < Math.min(lines.length, 3); i++) {
            String line = lines[i];
            // Alternar voces: línea 0 = voz[0], línea 1 = voz[1], línea 2 = voz[0]
            String voice = voices[i % 2];
            int hostNum = (i % 2) + 1;
            
            Optional<TTSService.TTSResult> ttsOpt = ttsService.generateSpeech(line, voice);
            
            if (ttsOpt.isEmpty()) {
                log.error("No se pudo generar TTS para línea {}", i);
                // Continuar con las líneas que sí funcionaron
                continue;
            }
            
            TTSService.TTSResult tts = ttsOpt.get();
            ttsResults.add(tts);
            audioUrls.add(tts.audioUrl());
            totalDuration += tts.duration();
            
            if (combinedScript.length() > 0) combinedScript.append("\n");
            combinedScript.append("[HOST").append(hostNum).append("] ").append(line);
        }
        
        if (audioUrls.isEmpty()) {
            log.error("No se pudo generar ningún TTS");
            return ResponseEntity.internalServerError().build();
        }
        
        // 3. Calcular parámetros de transición
        TransitionParamsDTO transition = radioService.calculateTransition(totalDuration);
        
        // 4. Construir respuesta
        // Formato: "multi:URL1|URL2|URL3" para indicar múltiples audios
        String multiAudioUrl = "multi:" + String.join("|", audioUrls);
        
        RadioAnnouncementDTO response = RadioAnnouncementDTO.builder()
            .audioUrl(multiAudioUrl)
            .duration(totalDuration)
            .script(combinedScript.toString())
            .transition(transition)
            .build();
        
        log.info("Anuncio dual generado exitosamente. {} líneas, duración total: {}s", 
            audioUrls.size(), totalDuration);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Verifica si es momento de hacer un anuncio (según contador).
     * El frontend llama esto después de cada canción.
     * INCREMENTA el contador.
     */
    @PostMapping("/check")
    public ResponseEntity<Map<String, Object>> checkForAnnouncement() {
        RadioConfigDTO config = radioService.getConfig();
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return ResponseEntity.ok(Map.of(
                "shouldAnnounce", false,
                "enabled", false
            ));
        }
        
        boolean shouldAnnounce = radioService.incrementCounterAndCheck();
        
        return ResponseEntity.ok(Map.of(
            "shouldAnnounce", shouldAnnounce,
            "enabled", true,
            "currentCount", config.getSongCounter() + 1,
            "frequency", config.getFrequency()
        ));
    }
    
    /**
     * Consulta si toca anuncio SIN incrementar contador.
     * Usado para pre-generación: el frontend pregunta "¿tocará anuncio en la siguiente?"
     */
    @GetMapping("/peek")
    public ResponseEntity<Map<String, Object>> peekForAnnouncement() {
        RadioConfigDTO config = radioService.getConfig();
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return ResponseEntity.ok(Map.of(
                "shouldAnnounce", false,
                "enabled", false
            ));
        }
        
        // Revisar si el SIGUIENTE incremento dispararía un anuncio
        int currentCount = config.getSongCounter();
        int frequency = config.getFrequency();
        
        // Simulamos el siguiente incremento
        int nextCount = currentCount + 1;
        boolean shouldAnnounce = nextCount >= frequency;
        
        return ResponseEntity.ok(Map.of(
            "shouldAnnounce", shouldAnnounce,
            "enabled", true,
            "currentCount", currentCount,
            "nextCount", nextCount,
            "frequency", frequency
        ));
    }
    
    /**
     * Proxy para servir audio de Replicate.
     * Esto evita problemas de CORS y permite aplicar amplificación en el frontend.
     * 
     * @param url URL codificada en Base64 del audio de Replicate
     */
    @GetMapping("/audio/{encodedUrl}")
    public ResponseEntity<byte[]> proxyAudio(@PathVariable String encodedUrl) {
        try {
            // Decodificar URL
            String audioUrl = new String(Base64.getUrlDecoder().decode(encodedUrl));
            log.debug("Proxy audio request: {}", audioUrl);
            
            // Verificar cache
            if (audioCache.containsKey(audioUrl)) {
                log.debug("Audio desde cache");
                byte[] cached = audioCache.get(audioUrl);
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "audio/wav")
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                    .body(cached);
            }
            
            // Descargar audio de Replicate
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(audioUrl))
                .GET()
                .build();
            
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            
            if (response.statusCode() != 200) {
                log.error("Error descargando audio: {}", response.statusCode());
                return ResponseEntity.status(response.statusCode()).build();
            }
            
            byte[] audioData = response.body();
            
            // Guardar en cache (limitado a 10 audios para no consumir mucha memoria)
            if (audioCache.size() < 10) {
                audioCache.put(audioUrl, audioData);
            }
            
            // Determinar content type
            String contentType = "audio/wav";
            if (audioUrl.contains(".mp3")) {
                contentType = "audio/mpeg";
            } else if (audioUrl.contains(".ogg")) {
                contentType = "audio/ogg";
            }
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                .body(audioData);
                
        } catch (Exception e) {
            log.error("Error en proxy de audio: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Limpia la cache de audio.
     */
    @DeleteMapping("/audio/cache")
    public ResponseEntity<Void> clearAudioCache() {
        audioCache.clear();
        log.info("Audio cache limpiado");
        return ResponseEntity.ok().build();
    }
}
