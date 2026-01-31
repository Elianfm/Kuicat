package com.kuicat.app.service;

import com.kuicat.app.dto.RadioContextDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Optional;

/**
 * Servicio para generar scripts de locución de radio usando OpenAI.
 * Genera texto para el locutor basándose en el contexto de las canciones.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioScriptService {
    
    private final SettingsService settingsService;
    private final RadioService radioService;
    
    private static final String OPENAI_API_KEY = "openai_api_key";
    private static final String MODEL = "gpt-4o-mini";
    
    /**
     * Genera el script para un anuncio de radio.
     * 
     * @param context Contexto con info de canciones anterior/siguiente
     * @return Script generado o empty si no hay API key
     */
    public Optional<String> generateScript(RadioContextDTO context) {
        Optional<String> apiKeyOpt = settingsService.getSetting(OPENAI_API_KEY);
        
        if (apiKeyOpt.isEmpty() || apiKeyOpt.get().isBlank()) {
            log.warn("No hay API key de OpenAI configurada para radio");
            return Optional.empty();
        }
        
        String apiKey = apiKeyOpt.get();
        
        try {
            OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(apiKey)
                .build();
            
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(MODEL)
                .temperature(0.8) // Un poco más creativo para el locutor
                .build();
            
            OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
            
            ChatClient chatClient = ChatClient.create(chatModel);
            
            String prompt = buildPrompt(context);
            
            log.debug("Generando script de radio...");
            
            String script = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            log.debug("Script generado: {}", script);
            
            return Optional.ofNullable(script);
            
        } catch (Exception e) {
            log.error("Error al generar script de radio: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    /**
     * Genera script para modo dúo (2 locutores).
     * El script tiene formato especial con [HOST1] y [HOST2].
     */
    public Optional<String[]> generateDualScript(RadioContextDTO context) {
        Optional<String> apiKeyOpt = settingsService.getSetting(OPENAI_API_KEY);
        
        if (apiKeyOpt.isEmpty() || apiKeyOpt.get().isBlank()) {
            log.warn("No hay API key de OpenAI configurada para radio");
            return Optional.empty();
        }
        
        String apiKey = apiKeyOpt.get();
        
        try {
            OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(apiKey)
                .build();
            
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(MODEL)
                .temperature(0.85) // Más creativo para diálogos
                .build();
            
            OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
            
            ChatClient chatClient = ChatClient.create(chatModel);
            
            String prompt = buildDualPrompt(context);
            
            log.debug("Generando script dual de radio...");
            
            String fullScript = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            log.debug("Script dual generado: {}", fullScript);
            
            // Parsear el script en 2 partes
            String[] scripts = parseDualScript(fullScript);
            
            return Optional.of(scripts);
            
        } catch (Exception e) {
            log.error("Error al generar script dual de radio: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    private String buildPrompt(RadioContextDTO context) {
        String personality = radioService.getPersonalityDescription();
        var config = radioService.getConfig();
        String greeting = getTimeBasedGreeting();
        
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are a radio DJ for radio station "%s".
            
            === YOUR PERSONALITY ===
            %s
            """.formatted(
                config.getRadioName(),
                personality
            ));
        
        // Nombre del oyente (opcional)
        if (config.getUserName() != null && !config.getUserName().isBlank()) {
            sb.append("""
                
                === LISTENER ===
                The listener's name is %s. You can occasionally greet them by name 
                to make the experience more personal (but don't overdo it).
                """.formatted(config.getUserName()));
        }
        
        sb.append("\n=== CONTEXT ===\n");
        
        // Canción anterior
        if (context.getPreviousTitle() != null) {
            sb.append("Song that just played:\n");
            sb.append("- Title: ").append(context.getPreviousTitle()).append("\n");
            if (context.getPreviousArtist() != null) {
                sb.append("- Artist: ").append(context.getPreviousArtist()).append("\n");
            }
            if (context.getPreviousAlbum() != null) {
                sb.append("- Album: ").append(context.getPreviousAlbum()).append("\n");
            }
            if (context.getPreviousGenre() != null) {
                sb.append("- Genre: ").append(context.getPreviousGenre()).append("\n");
            }
            if (context.getPreviousYear() != null) {
                sb.append("- Year: ").append(context.getPreviousYear()).append("\n");
            }
            if (context.getPreviousDescription() != null) {
                sb.append("- Description: ").append(context.getPreviousDescription()).append("\n");
            }
        }
        
        sb.append("\n");
        
        // Canción siguiente
        if (context.getNextTitle() != null) {
            sb.append("Coming up next:\n");
            sb.append("- Title: ").append(context.getNextTitle()).append("\n");
            if (context.getNextArtist() != null) {
                sb.append("- Artist: ").append(context.getNextArtist()).append("\n");
            }
            if (context.getNextAlbum() != null) {
                sb.append("- Album: ").append(context.getNextAlbum()).append("\n");
            }
            if (context.getNextGenre() != null) {
                sb.append("- Genre: ").append(context.getNextGenre()).append("\n");
            }
            if (context.getNextYear() != null) {
                sb.append("- Year: ").append(context.getNextYear()).append("\n");
            }
            if (context.getNextDescription() != null) {
                sb.append("- Description: ").append(context.getNextDescription()).append("\n");
            }
        }
        
        // Contexto de sesión
        if (context.getSongsPlayedCount() != null && context.getSongsPlayedCount() > 0) {
            sb.append("\nSession info: ").append(context.getSongsPlayedCount())
              .append(" songs played");
            if (context.getSessionMinutes() != null) {
                sb.append(" over ").append(context.getSessionMinutes()).append(" minutes");
            }
            sb.append(".\n");
        }
        
        sb.append("\nTime of day hint: ").append(greeting).append("\n");
        
        sb.append("""
            
            === INSTRUCTIONS ===
            Generate a SHORT radio announcement (30-60 words max).
            
            MAKE IT INTERESTING by including ONE of these:
            - A fun fact about the artist (awards, records, collaborations)
            - Historical context (when/where the song was made, what inspired it)
            - A personal anecdote or opinion about the song
            - A connection between the previous and next song (genre, era, theme)
            - A trivia question for listeners
            - Mention if it's a classic, a hit, or an underrated gem
            
            DON'T just say "that was X, up next is Y". Add personality and interesting info!
            
            RULES:
            1. Be NATURAL and CONVERSATIONAL
            2. Stay in character with your personality
            3. Keep it SHORT - this will be spoken aloud
            4. NO emojis, NO hashtags, NO special characters
            5. Write in ENGLISH only
            6. Do NOT include any prefixes like "DJ:" or "[HOST]:"
            7. Just the announcement text, nothing else
            
            Your announcement:
            """);
        
        return sb.toString();
    }
    
    private String buildDualPrompt(RadioContextDTO context) {
        String personality1 = radioService.getPersonalityDescription();
        String personality2 = radioService.getPersonality2Description();
        var config = radioService.getConfig();
        String greeting = getTimeBasedGreeting();
        
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are writing a dialogue between TWO radio hosts for radio station "%s".
            
            === HOST 1 PERSONALITY ===
            %s
            
            === HOST 2 PERSONALITY ===
            %s
            
            HOST1 leads the conversation. HOST2 is the sidekick who adds comments, jokes, and reactions.
            """.formatted(
                config.getRadioName(),
                personality1,
                personality2
            ));
        
        // Nombre del oyente (opcional)
        if (config.getUserName() != null && !config.getUserName().isBlank()) {
            sb.append("""
                
                === LISTENER ===
                The listener's name is %s. You can occasionally greet them by name 
                to make the experience more personal (but don't overdo it).
                """.formatted(config.getUserName()));
        }
        
        sb.append("\n=== CONTEXT ===\n");
        
        // Misma info de contexto que buildPrompt
        if (context.getPreviousTitle() != null) {
            sb.append("Song that just played:\n");
            sb.append("- Title: ").append(context.getPreviousTitle()).append("\n");
            if (context.getPreviousArtist() != null) {
                sb.append("- Artist: ").append(context.getPreviousArtist()).append("\n");
            }
            if (context.getPreviousDescription() != null) {
                sb.append("- Description: ").append(context.getPreviousDescription()).append("\n");
            }
        }
        
        sb.append("\n");
        
        if (context.getNextTitle() != null) {
            sb.append("Coming up next:\n");
            sb.append("- Title: ").append(context.getNextTitle()).append("\n");
            if (context.getNextArtist() != null) {
                sb.append("- Artist: ").append(context.getNextArtist()).append("\n");
            }
            if (context.getNextDescription() != null) {
                sb.append("- Description: ").append(context.getNextDescription()).append("\n");
            }
        }
        
        sb.append("\nTime of day hint: ").append(greeting).append("\n");
        
        sb.append("""
            
            === INSTRUCTIONS ===
            Generate a SHORT dialogue with EXACTLY 3 lines between the two hosts.
            
            MAKE IT INTERESTING! Include at least ONE of these:
            - A fun fact about the artist (awards, records, collaborations)
            - Historical context or trivia about the song
            - A playful debate or opinion about the music
            - A connection between the songs (genre, era, theme)
            - A joke or witty comment that fits their personalities
            
            DON'T just say "that was X, up next is Y". Be entertaining!
            
            FORMAT YOUR RESPONSE EXACTLY LIKE THIS (3 lines only):
            [HOST1] First host opens with something interesting
            [HOST2] Second host reacts, adds info, or jokes
            [HOST1] First host wraps up and transitions to next song
            
            RULES:
            1. EXACTLY 3 lines - no more, no less
            2. Keep each line SHORT (25-50 words max per line)
            3. The dialogue should flow naturally as a conversation
            4. They can banter, joke, or react to each other
            5. NO emojis, NO hashtags
            6. Write in ENGLISH only
            7. Use EXACTLY the format [HOST1] and [HOST2] prefixes
            8. The last line should transition to the next song
            
            Your dialogue:
            """);
        
        return sb.toString();
    }
    
    /**
     * Parsea un script dual en un array de líneas alternadas.
     * Devuelve exactamente 3 strings (uno por cada línea).
     */
    private String[] parseDualScript(String fullScript) {
        java.util.List<String> lines = new java.util.ArrayList<>();
        
        String[] rawLines = fullScript.split("\n");
        for (String line : rawLines) {
            line = line.trim();
            if (line.startsWith("[HOST1]") || line.startsWith("[HOST2]")) {
                String text = line.replaceFirst("\\[HOST[12]\\]\\s*", "").trim();
                if (!text.isEmpty()) {
                    lines.add(text);
                }
            }
        }
        
        // Si no se parseó bien o no hay 3 líneas, ajustar
        if (lines.isEmpty()) {
            // Fallback: dividir el texto completo
            String cleaned = fullScript.replaceAll("\\[HOST[12]\\]", "").trim();
            return new String[] { cleaned };
        }
        
        // Retornar las líneas que tenemos (idealmente 3)
        return lines.toArray(new String[0]);
    }
    
    private String getTimeBasedGreeting() {
        int hour = LocalTime.now().getHour();
        if (hour < 6) return "Late night / early morning";
        if (hour < 12) return "Morning";
        if (hour < 17) return "Afternoon";
        if (hour < 21) return "Evening";
        return "Night";
    }
}
