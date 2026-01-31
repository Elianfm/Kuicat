package com.kuicat.app.service;

import com.kuicat.app.dto.SongDTO;
import com.kuicat.app.dto.SongMetadataDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio para auto-completar metadata de canciones usando IA (OpenAI).
 * Usa el modelo gpt-4o-mini para mantener costos bajos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MetadataAIService {
    
    private final SettingsService settingsService;
    
    private static final String OPENAI_API_KEY = "openai_api_key";
    private static final String MODEL = "gpt-4o-mini";
    
    /**
     * Analiza toda la información disponible de una canción y genera metadata mejorada.
     * 
     * @param song la canción completa con todos sus datos actuales
     * @return metadata sugerida o empty si no hay API key configurada
     */
    public Optional<SongMetadataDTO> autoFillMetadata(SongDTO song) {
        // Obtener API key descifrada
        Optional<String> apiKeyOpt = settingsService.getSetting(OPENAI_API_KEY);
        
        if (apiKeyOpt.isEmpty() || apiKeyOpt.get().isBlank()) {
            log.warn("No hay API key de OpenAI configurada");
            return Optional.empty();
        }
        
        String apiKey = apiKeyOpt.get();
        
        try {
            // Crear cliente OpenAI con la API key del settings
            OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(apiKey)
                .build();
            
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(MODEL)
                .temperature(0.3) // Baja temperatura para respuestas más consistentes
                .build();
            
            OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
            
            ChatClient chatClient = ChatClient.create(chatModel);
            
            // Extraer nombre del archivo sin extensión
            String fileName = extractFileName(song.getFilePath());
            
            // Crear prompt (con toda la info disponible)
            String prompt = buildPrompt(song, fileName);
            
            log.debug("Solicitando metadata a OpenAI para: {}", song.getTitle());
            
            // Llamar a la IA
            SongMetadataDTO result = chatClient.prompt()
                .user(prompt)
                .call()
                .entity(SongMetadataDTO.class);
            
            log.debug("Metadata recibida de IA: {}", result);
            
            return Optional.ofNullable(result);
            
        } catch (Exception e) {
            log.error("Error al obtener metadata de IA: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    private String extractFileName(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return "";
        }
        try {
            Path path = Path.of(filePath);
            String fileName = path.getFileName().toString();
            // Quitar extensión
            int lastDot = fileName.lastIndexOf('.');
            if (lastDot > 0) {
                return fileName.substring(0, lastDot);
            }
            return fileName;
        } catch (Exception e) {
            return filePath;
        }
    }
    
    private String buildPrompt(SongDTO song, String fileName) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("""
            Analiza la siguiente información de una canción y genera/mejora la metadata.
            
            === INFORMACIÓN DISPONIBLE ===
            Título actual: %s
            Nombre del archivo: %s
            """.formatted(
                song.getTitle() != null ? song.getTitle() : "Desconocido",
                fileName));
        
        // Añadir info existente que pueda ayudar
        if (song.getArtist() != null && !song.getArtist().isBlank()) {
            prompt.append("Artista actual: ").append(song.getArtist()).append("\n");
        }
        if (song.getAlbum() != null && !song.getAlbum().isBlank()) {
            prompt.append("Álbum actual: ").append(song.getAlbum()).append("\n");
        }
        if (song.getGenre() != null && !song.getGenre().isBlank()) {
            prompt.append("Género actual: ").append(song.getGenre()).append("\n");
        }
        if (song.getYear() != null) {
            prompt.append("Año actual: ").append(song.getYear()).append("\n");
        }
        if (song.getDuration() != null && song.getDuration() > 0) {
            int mins = song.getDuration() / 60;
            int secs = song.getDuration() % 60;
            prompt.append("Duración: ").append(mins).append(":").append(String.format("%02d", secs)).append("\n");
        }
        
        // Añadir lyrics si existen
        if (song.getLyrics() != null && !song.getLyrics().isBlank()) {
            prompt.append("\nLetra de la canción:\n").append(song.getLyrics()).append("\n");
        }
        
        prompt.append("""
            
            === INSTRUCCIONES ===
            Genera un JSON con metadata mejorada/completada para esta canción.
            
            Campos requeridos:
            - title: título limpio de la canción (sin artista, sin calidad de audio, sin corchetes)
            - artist: nombre del artista o banda
            - album: nombre del álbum (si se puede inferir)
            - genre: género musical (Pop, Rock, Electronic, Hip-Hop, Jazz, Classical, Metal, Folk, R&B, Latin, Alternative, Indie, etc.)
            - year: año de lanzamiento (si es una canción conocida)
            - description: SIEMPRE genera una descripción breve y creativa de la canción (máximo 150 caracteres). Describe el mood, la temática o algo interesante.
            
            REGLAS:
            1. Si el título tiene formato "Artista - Canción", sepáralos correctamente
            2. Si el título tiene [HQ], [Official], (Audio), números de track, quítalos
            3. Usa la información existente si es correcta, mejórala si puedes
            4. Para el género, usa categorías conocidas
            5. La descripción es OBLIGATORIA - siempre genera algo interesante sobre la canción
            6. Si no conoces un campo con certeza, usa null EXCEPTO descripción
            7. Responde SOLO el JSON, sin markdown, sin explicaciones
            
            JSON:
            """);
        
        return prompt.toString();
    }
}
