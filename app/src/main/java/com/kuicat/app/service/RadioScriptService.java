package com.kuicat.app.service;

import com.kuicat.app.dto.RadioContextDTO;
import com.kuicat.app.dto.RadioMemory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;
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
    private final ObjectMapper objectMapper;
    
    private static final String OPENAI_API_KEY = "openai_api_key";
    private static final String MODEL = "gpt-4o-mini";
    
    /**
     * Genera la identidad de sesión basándose en las instrucciones del usuario
     * y las primeras canciones en cola.
     */
    public Optional<RadioMemory.RadioIdentity> generateSessionIdentity(List<String> upcomingSongs) {
        Optional<String> apiKeyOpt = settingsService.getSetting(OPENAI_API_KEY);
        
        if (apiKeyOpt.isEmpty() || apiKeyOpt.get().isBlank()) {
            log.warn("No hay API key de OpenAI configurada para identidad");
            return Optional.empty();
        }
        
        try {
            ChatClient chatClient = createChatClient(apiKeyOpt.get(), 0.9);
            String prompt = buildIdentityPrompt(upcomingSongs);
            
            log.debug("Generando identidad de sesión...");
            
            String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            log.debug("Identidad generada: {}", response);
            
            // Parsear JSON
            RadioMemory.RadioIdentity identity = parseIdentityResponse(response);
            return Optional.ofNullable(identity);
            
        } catch (Exception e) {
            log.error("Error generando identidad: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
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
            ChatClient chatClient = createChatClient(apiKey, 0.8);
            String prompt = buildPrompt(context);
            
            log.debug("Generando script de radio...");
            
            String script = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            log.debug("Script generado: {}", script);
            
            // Guardar en memoria
            if (script != null && !script.isBlank()) {
                radioService.addScriptToMemory(script);
            }
            
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
            ChatClient chatClient = createChatClient(apiKey, 0.85);
            String prompt = buildDualPrompt(context);
            
            log.debug("Generando script dual de radio...");
            
            String fullScript = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
            
            log.debug("Script dual generado: {}", fullScript);
            
            // Parsear el script en partes
            String[] scripts = parseDualScript(fullScript);
            
            // Guardar diálogo completo en memoria
            if (fullScript != null && !fullScript.isBlank()) {
                radioService.addScriptToMemory(fullScript);
            }
            
            return Optional.of(scripts);
            
        } catch (Exception e) {
            log.error("Error al generar script dual de radio: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    /**
     * Crea un cliente de chat de OpenAI.
     */
    private ChatClient createChatClient(String apiKey, double temperature) {
        OpenAiApi openAiApi = OpenAiApi.builder()
            .apiKey(apiKey)
            .build();
        
        OpenAiChatOptions options = OpenAiChatOptions.builder()
            .model(MODEL)
            .temperature(temperature)
            .build();
        
        OpenAiChatModel chatModel = OpenAiChatModel.builder()
            .openAiApi(openAiApi)
            .defaultOptions(options)
            .build();
        
        return ChatClient.create(chatModel);
    }
    
    /**
     * Construye el prompt para generar la identidad de sesión.
     */
    private String buildIdentityPrompt(List<String> upcomingSongs) {
        var config = radioService.getConfig();
        String userInstructions = radioService.getUserInstructions();
        String greeting = getTimeBasedGreeting();
        
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are about to start a radio session. Create a unique identity for this session.
            
            === STATION INFO ===
            Station name: %s
            Time of day: %s
            """.formatted(config.getRadioName(), greeting));
        
        // Instrucciones del usuario
        if (userInstructions != null && !userInstructions.isBlank()) {
            sb.append("\n=== USER'S INSTRUCTIONS ===\n");
            sb.append(userInstructions).append("\n");
        } else {
            sb.append("\n(No specific instructions - be creative!)\n");
        }
        
        // Primeras canciones en cola
        if (upcomingSongs != null && !upcomingSongs.isEmpty()) {
            sb.append("\n=== FIRST SONGS IN QUEUE ===\n");
            for (int i = 0; i < Math.min(upcomingSongs.size(), 5); i++) {
                sb.append("- ").append(upcomingSongs.get(i)).append("\n");
            }
        }
        
        sb.append("""
            
            === YOUR TASK ===
            Based on the time of day, user instructions, and upcoming songs,
            create a creative session identity. Respond with ONLY a JSON object:
            
            {
              "sessionName": "A creative name for tonight's session (e.g., 'Noches de Rock', 'Viaje Musical')",
              "sessionVibe": "2-3 words describing the mood (e.g., 'nostálgico y relajante', 'energético y divertido')",
              "openingNarrative": "Brief theme for this session - what story will you tell? (1-2 sentences)",
              "djStyle": "How you'll speak tonight (e.g., 'warm and friendly', 'enthusiastic and energetic')"
            }
            
            IMPORTANT: Return ONLY the JSON, no markdown, no extra text.
            """);
        
        return sb.toString();
    }
    
    /**
     * Parsea la respuesta JSON de identidad.
     */
    private RadioMemory.RadioIdentity parseIdentityResponse(String response) {
        try {
            // Limpiar posibles markdown
            String json = response.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("```json?\\s*", "").replaceAll("```\\s*$", "");
            }
            
            var node = objectMapper.readTree(json);
            
            return RadioMemory.RadioIdentity.builder()
                .sessionName(node.has("sessionName") ? node.get("sessionName").asText() : "Radio Session")
                .sessionVibe(node.has("sessionVibe") ? node.get("sessionVibe").asText() : "chill and friendly")
                .openingNarrative(node.has("openingNarrative") ? node.get("openingNarrative").asText() : "")
                .djStyle(node.has("djStyle") ? node.get("djStyle").asText() : "friendly and casual")
                .build();
                
        } catch (Exception e) {
            log.error("Error parsing identity JSON: {}", e.getMessage());
            // Devolver identidad por defecto
            return RadioMemory.RadioIdentity.builder()
                .sessionName("Radio Session")
                .sessionVibe("chill and friendly")
                .openingNarrative("Let's enjoy some great music together!")
                .djStyle("friendly and casual")
                .build();
        }
    }
    
    private String buildPrompt(RadioContextDTO context) {
        String personality = radioService.getPersonalityDescription();
        var config = radioService.getConfig();
        var memory = radioService.getMemory();
        String greeting = getTimeBasedGreeting();
        String djName = radioService.getDjName1();
        
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are %s, a radio DJ for radio station "%s".
            
            === YOUR PERSONALITY ===
            %s
            """.formatted(
                djName,
                config.getRadioName(),
                personality
            ));
        
        // Identidad de sesión (si existe)
        var identity = memory.getIdentity();
        if (identity != null) {
            sb.append("""
                
                === SESSION IDENTITY ===
                Tonight's theme: %s
                Vibe: %s
                Narrative: %s
                Your style tonight: %s
                """.formatted(
                    identity.getSessionName(),
                    identity.getSessionVibe(),
                    identity.getOpeningNarrative(),
                    identity.getDjStyle()
                ));
        }
        
        // Nombre del oyente (opcional)
        if (config.getUserName() != null && !config.getUserName().isBlank()) {
            sb.append("""
                
                === LISTENER ===
                The listener's name is %s. You can occasionally greet them by name 
                to make the experience more personal (but don't overdo it).
                """.formatted(config.getUserName()));
        }
        
        // MEMORIA: Historial de lo dicho
        if (!memory.isFirstAnnouncement()) {
            sb.append("\n=== WHAT YOU'VE SAID (MEMORY) ===\n");
            sb.append("DON'T repeat facts or stories from previous announcements!\n\n");
            sb.append(memory.getFormattedScriptHistory());
            sb.append("\n");
        }
        
        // HISTORIAL DE CANCIONES
        // Canciones anteriores
        List<String> prevSongs = memory.getPreviousSongsList();
        if (!prevSongs.isEmpty()) {
            sb.append("\n=== SONGS WE'VE PLAYED ===\n");
            for (String song : prevSongs) {
                sb.append("- ").append(song).append("\n");
            }
        }
        
        // Próximas canciones (del contexto)
        if (context.getUpcomingSongs() != null && !context.getUpcomingSongs().isEmpty()) {
            sb.append("\n=== COMING UP LATER ===\n");
            for (String song : context.getUpcomingSongs()) {
                sb.append("- ").append(song).append("\n");
            }
        }
        
        sb.append("\n=== CURRENT TRANSITION ===\n");
        
        // Canción anterior
        if (context.getPreviousTitle() != null) {
            sb.append("Just finished:\n");
            sb.append("- Title: ").append(context.getPreviousTitle()).append("\n");
            if (context.getPreviousArtist() != null) {
                sb.append("- Artist: ").append(context.getPreviousArtist()).append("\n");
            }
            if (context.getPreviousDescription() != null) {
                sb.append("- Description: ").append(context.getPreviousDescription()).append("\n");
            }
            if (context.getPreviousRankPosition() != null) {
                sb.append("- User Ranking: #").append(context.getPreviousRankPosition()).append(" in their personal chart\n");
            }
        }
        
        sb.append("\n");
        
        // Canción siguiente
        if (context.getNextTitle() != null) {
            sb.append("Now playing:\n");
            sb.append("- Title: ").append(context.getNextTitle()).append("\n");
            if (context.getNextArtist() != null) {
                sb.append("- Artist: ").append(context.getNextArtist()).append("\n");
            }
            if (context.getNextDescription() != null) {
                sb.append("- Description: ").append(context.getNextDescription()).append("\n");
            }
            if (context.getNextRankPosition() != null) {
                sb.append("- User Ranking: #").append(context.getNextRankPosition()).append(" in their personal chart\n");
            }
        }
        
        sb.append("\nTime of day: ").append(greeting).append("\n");
        sb.append("Announcement #").append(memory.getAnnouncementCount() + 1).append(" of this session\n");
        
        sb.append("""
            
            === INSTRUCTIONS ===
            Generate a SHORT radio announcement (30-60 words max).
            
            %s
            
            MAKE IT INTERESTING by including ONE of these:
            - A fun fact about the artist or song
            - A connection to what you've said before (continue the narrative)
            - Reference a song from the history ("Earlier we heard...")
            - Tease an upcoming song ("Later we have...")
            - Historical context or trivia
            
            DON'T repeat anything from your MEMORY section!
            
            RULES:
            1. Be NATURAL and CONVERSATIONAL
            2. Stay in character with your personality and tonight's vibe
            3. Keep it SHORT - this will be spoken aloud
            4. NO emojis, NO hashtags, NO special characters
            5. Write in ENGLISH only
            6. Do NOT include any prefixes like "DJ:" or "[HOST]:"
            7. Just the announcement text, nothing else
            
            Your announcement:
            """.formatted(
                memory.isFirstAnnouncement() 
                    ? "This is your FIRST announcement - introduce the session theme!" 
                    : "Continue the narrative thread from your previous announcements."
            ));
        
        return sb.toString();
    }
    
    private String buildDualPrompt(RadioContextDTO context) {
        String personality1 = radioService.getPersonalityDescription();
        String personality2 = radioService.getPersonality2Description();
        var config = radioService.getConfig();
        var memory = radioService.getMemory();
        String greeting = getTimeBasedGreeting();
        String dj1Name = radioService.getDjName1();
        String dj2Name = radioService.getDjName2();
        
        StringBuilder sb = new StringBuilder();
        sb.append("""
            You are writing a dialogue between TWO radio hosts for radio station "%s".
            
            === HOST 1: %s ===
            %s
            
            === HOST 2: %s ===
            %s
            
            %s leads the conversation. %s is the sidekick who adds comments, jokes, and reactions.
            They have great chemistry and banter naturally.
            """.formatted(
                config.getRadioName(),
                dj1Name,
                personality1,
                dj2Name,
                personality2,
                dj1Name,
                dj2Name
            ));
        
        // Identidad de sesión (si existe)
        var identity = memory.getIdentity();
        if (identity != null) {
            sb.append("""
                
                === SESSION IDENTITY ===
                Tonight's theme: %s
                Vibe: %s
                """.formatted(
                    identity.getSessionName(),
                    identity.getSessionVibe()
                ));
        }
        
        // Nombre del oyente (opcional)
        if (config.getUserName() != null && !config.getUserName().isBlank()) {
            sb.append("""
                
                === LISTENER ===
                The listener's name is %s. You can occasionally greet them by name 
                to make the experience more personal (but don't overdo it).
                """.formatted(config.getUserName()));
        }
        
        // MEMORIA: Historial de lo dicho
        if (!memory.isFirstAnnouncement()) {
            sb.append("\n=== WHAT YOU'VE SAID (MEMORY) ===\n");
            sb.append("DON'T repeat facts or jokes from previous dialogues!\n\n");
            sb.append(memory.getFormattedScriptHistory());
            sb.append("\n");
        }
        
        // HISTORIAL DE CANCIONES
        List<String> prevSongs = memory.getPreviousSongsList();
        if (!prevSongs.isEmpty()) {
            sb.append("\n=== SONGS WE'VE PLAYED ===\n");
            for (String song : prevSongs) {
                sb.append("- ").append(song).append("\n");
            }
        }
        
        if (context.getUpcomingSongs() != null && !context.getUpcomingSongs().isEmpty()) {
            sb.append("\n=== COMING UP LATER ===\n");
            for (String song : context.getUpcomingSongs()) {
                sb.append("- ").append(song).append("\n");
            }
        }
        
        sb.append("\n=== CURRENT TRANSITION ===\n");
        
        if (context.getPreviousTitle() != null) {
            sb.append("Just finished:\n");
            sb.append("- ").append(context.getPreviousTitle());
            if (context.getPreviousArtist() != null) {
                sb.append(" by ").append(context.getPreviousArtist());
            }
            sb.append("\n");
            if (context.getPreviousDescription() != null) {
                sb.append("  Description: ").append(context.getPreviousDescription()).append("\n");
            }
            if (context.getPreviousRankPosition() != null) {
                sb.append("  User Ranking: #").append(context.getPreviousRankPosition()).append(" in their personal chart\n");
            }
        }
        
        if (context.getNextTitle() != null) {
            sb.append("Now playing:\n");
            sb.append("- ").append(context.getNextTitle());
            if (context.getNextArtist() != null) {
                sb.append(" by ").append(context.getNextArtist());
            }
            sb.append("\n");
            if (context.getNextDescription() != null) {
                sb.append("  Description: ").append(context.getNextDescription()).append("\n");
            }
            if (context.getNextRankPosition() != null) {
                sb.append("  User Ranking: #").append(context.getNextRankPosition()).append(" in their personal chart\n");
            }
        }
        
        sb.append("\nTime of day: ").append(greeting).append("\n");
        sb.append("Announcement #").append(memory.getAnnouncementCount() + 1).append(" of this session\n");
        
        sb.append("""
            
            === INSTRUCTIONS ===
            Generate a SHORT dialogue with EXACTLY 3 lines between %s and %s.
            
            %s
            
            MAKE IT INTERESTING! Include at least ONE of these:
            - A fun fact or trivia about the song/artist
            - A playful debate or opinion about the music
            - Reference to a song from the history ("Remember earlier when...")
            - A connection between the songs (genre, era, theme)
            - A joke or witty banter that fits their personalities
            - They can call each other by name naturally
            
            DON'T repeat anything from your MEMORY section!
            
            FORMAT YOUR RESPONSE EXACTLY LIKE THIS (3 lines only):
            [HOST1] %s opens with something interesting
            [HOST2] %s reacts, adds info, or jokes
            [HOST1] %s wraps up and transitions to next song
            
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
            """.formatted(
                dj1Name,
                dj2Name,
                memory.isFirstAnnouncement() 
                    ? "This is your FIRST dialogue - introduce yourselves by name and the session theme!" 
                    : "Continue the banter and narrative from your previous dialogues.",
                dj1Name,
                dj2Name,
                dj1Name
            ));
        
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
