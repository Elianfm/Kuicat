package com.kuicat.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuicat.app.dto.RadioConfigDTO;
import com.kuicat.app.dto.RadioMemory;
import com.kuicat.app.dto.TransitionParamsDTO;
import com.kuicat.app.entity.RadioConfig;
import com.kuicat.app.mapper.RadioConfigMapper;
import com.kuicat.app.repository.RadioConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;

/**
 * Servicio para gestionar el Modo Radio IA.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    
    private final RadioConfigRepository radioConfigRepository;
    private final RadioConfigMapper radioConfigMapper;
    private final ObjectMapper objectMapper;
    
    /**
     * Memoria de sesión.
     * Se carga desde BD al iniciar y se persiste al actualizar.
     */
    private RadioMemory sessionMemory = new RadioMemory();
    
    /**
     * Carga la memoria desde la BD al iniciar el servicio.
     */
    @PostConstruct
    public void init() {
        loadMemoryFromDb();
    }
    
    /**
     * Obtiene la configuración actual del radio.
     */
    public RadioConfigDTO getConfig() {
        RadioConfig config = radioConfigRepository.getConfig();
        return radioConfigMapper.toDTO(config);
    }
    
    /**
     * Actualiza la configuración del radio.
     */
    @Transactional
    public RadioConfigDTO updateConfig(RadioConfigDTO dto) {
        RadioConfig config = radioConfigRepository.getConfig();
        radioConfigMapper.updateEntity(config, dto);
        RadioConfig saved = radioConfigRepository.save(config);
        log.info("Radio config actualizada: enabled={}, personality={}, frequency={}", 
            saved.getEnabled(), saved.getPersonality(), saved.getFrequency());
        return radioConfigMapper.toDTO(saved);
    }
    
    /**
     * Activa o desactiva el modo radio.
     */
    @Transactional
    public RadioConfigDTO toggleEnabled() {
        RadioConfig config = radioConfigRepository.getConfig();
        config.setEnabled(!config.getEnabled());
        if (config.getEnabled()) {
            config.setSongCounter(0); // Reset contador al activar
            resetMemory(); // Reset memoria de sesión
        } else {
            resetMemory(); // También resetear al desactivar
        }
        RadioConfig saved = radioConfigRepository.save(config);
        log.info("Radio mode toggled: enabled={}", saved.getEnabled());
        return radioConfigMapper.toDTO(saved);
    }
    
    // ========== MEMORY MANAGEMENT ==========
    
    /**
     * Obtiene la memoria de sesión actual.
     */
    public RadioMemory getMemory() {
        return sessionMemory;
    }
    
    /**
     * Resetea la memoria para una nueva sesión.
     * También limpia la memoria persistida en BD.
     */
    @Transactional
    public void resetMemory() {
        sessionMemory = new RadioMemory();
        sessionMemory.setSessionStart(LocalDateTime.now());
        
        // Limpiar en BD
        RadioConfig config = radioConfigRepository.getConfig();
        config.setScriptHistory(null);
        config.setPreviousSongs(null);
        config.setSessionIdentity(null);
        config.setAnnouncementCount(0);
        radioConfigRepository.save(config);
        
        log.info("Radio memory reset for new session");
    }
    
    /**
     * Añade un script al historial de memoria.
     * Persiste en BD para sobrevivir reinicios.
     */
    @Transactional
    public void addScriptToMemory(String script) {
        sessionMemory.addScript(script);
        persistMemoryToDb();
        log.debug("Script added to memory. Total chars: {}, Announcement #{}",
            sessionMemory.getTotalScriptChars(), sessionMemory.getAnnouncementCount());
    }
    
    /**
     * Añade una canción al historial de reproducidas.
     * Persiste en BD para sobrevivir reinicios.
     */
    @Transactional
    public void addSongToHistory(String title, String artist) {
        String songInfo = String.format("%s - %s", 
            title != null ? title : "Unknown", 
            artist != null ? artist : "Unknown");
        sessionMemory.addPreviousSong(songInfo);
        persistMemoryToDb();
    }
    
    /**
     * Establece la identidad de la sesión.
     * Persiste en BD para sobrevivir reinicios.
     */
    @Transactional
    public void setSessionIdentity(RadioMemory.RadioIdentity identity) {
        sessionMemory.setIdentity(identity);
        persistMemoryToDb();
        log.info("Session identity set: {}", identity.getSessionName());
    }
    
    /**
     * Verifica si necesitamos generar la identidad de sesión.
     */
    public boolean needsIdentityGeneration() {
        return sessionMemory.getIdentity() == null;
    }
    
    /**
     * Obtiene las instrucciones personalizadas del usuario.
     */
    public String getUserInstructions() {
        RadioConfig config = radioConfigRepository.getConfig();
        return config.getUserInstructions();
    }

    /**
     * Incrementa el contador de canciones y verifica si toca anuncio.
     * @return true si es momento de hacer un anuncio
     */
    @Transactional
    public boolean incrementCounterAndCheck() {
        RadioConfig config = radioConfigRepository.getConfig();
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return false;
        }
        
        int newCount = config.getSongCounter() + 1;
        config.setSongCounter(newCount);
        
        boolean shouldAnnounce = newCount >= config.getFrequency();
        
        if (shouldAnnounce) {
            config.setSongCounter(0); // Reset para el siguiente ciclo
            log.debug("Radio: Momento de anuncio! (counter reset)");
        }
        
        radioConfigRepository.save(config);
        return shouldAnnounce;
    }
    
    /**
     * Calcula los parámetros de transición según la duración del TTS.
     */
    public TransitionParamsDTO calculateTransition(double ttsDuration) {
        TransitionParamsDTO params = new TransitionParamsDTO();
        
        // Pre-silencio corto antes del anuncio
        params.setPreSilence(400);
        
        // Post-silencio largo (5 segundos) antes de que suba el volumen de la música
        // Esto permite que la música de fondo suene un poco más antes del fade in
        params.setPostSilence(5000);
        
        // Ajustar fade out según duración del TTS
        if (ttsDuration < 10) {
            // Locución corta = transiciones rápidas
            params.setFadeOutDuration(2000);
        } else if (ttsDuration < 20) {
            // Normal
            params.setFadeOutDuration(3000);
        } else {
            // Locución larga = transiciones suaves
            params.setFadeOutDuration(4000);
        }
        
        params.setFadeInDuration(2500); // 2.5s para entrada suave
        
        return params;
    }
    
    /**
     * Obtiene la descripción de la personalidad para el prompt.
     */
    public String getPersonalityDescription() {
        RadioConfig config = radioConfigRepository.getConfig();
        
        return switch (config.getPersonality()) {
            case "energetic" -> """
                You are an ENERGETIC and ENTHUSIASTIC radio DJ! You're super excited about every song.
                Use exclamations! Be upbeat and dynamic! Make listeners feel the energy!
                Keep your commentary punchy and fun.
                """;
            case "classic" -> """
                You are a CLASSIC radio host with a deep, smooth voice. You speak formally and professionally.
                Your style is reminiscent of golden age radio. You're knowledgeable and sophisticated.
                Use elegant language and take your time.
                """;
            case "casual" -> """
                You are a CASUAL, friendly radio host. You talk like you're chatting with a good friend.
                Be relaxed, conversational, and warm. Use everyday language.
                Make listeners feel comfortable and at home.
                """;
            case "critic" -> """
                You are a MUSIC CRITIC radio host. You love sharing fun facts and musical trivia.
                Analyze songs briefly, mention interesting details about artists, albums, or genres.
                Be knowledgeable but not pretentious. Educate while entertaining.
                """;
            case "nostalgic" -> """
                You are a NOSTALGIC radio host who loves reminiscing about music memories.
                Connect songs to emotions, memories, and life moments.
                Be warm, sentimental, and evocative. Make listeners feel the emotional connection to music.
                """;
            case "custom" -> config.getCustomPersonality() != null ? 
                config.getCustomPersonality() : 
                "You are a friendly radio DJ.";
            default -> "You are a friendly radio DJ.";
        };
    }
    
    /**
     * Obtiene la descripción de la personalidad del segundo host para el prompt.
     */
    public String getPersonality2Description() {
        RadioConfig config = radioConfigRepository.getConfig();
        String personality = config.getPersonality2() != null ? config.getPersonality2() : "casual";
        
        return switch (personality) {
            case "energetic" -> """
                You are an ENERGETIC and ENTHUSIASTIC radio DJ! You're super excited about every song.
                Use exclamations! Be upbeat and dynamic! Make listeners feel the energy!
                Keep your commentary punchy and fun.
                """;
            case "classic" -> """
                You are a CLASSIC radio host with a deep, smooth voice. You speak formally and professionally.
                Your style is reminiscent of golden age radio. You're knowledgeable and sophisticated.
                Use elegant language and take your time.
                """;
            case "casual" -> """
                You are a CASUAL, friendly radio host. You talk like you're chatting with a good friend.
                Be relaxed, conversational, and warm. Use everyday language.
                Make listeners feel comfortable and at home.
                """;
            case "critic" -> """
                You are a MUSIC CRITIC radio host. You love sharing fun facts and musical trivia.
                Analyze songs briefly, mention interesting details about artists, albums, or genres.
                Be knowledgeable but not pretentious. Educate while entertaining.
                """;
            case "nostalgic" -> """
                You are a NOSTALGIC radio host who loves reminiscing about music memories.
                Connect songs to emotions, memories, and life moments.
                Be warm, sentimental, and evocative. Make listeners feel the emotional connection to music.
                """;
            case "custom" -> config.getCustomPersonality2() != null ? 
                config.getCustomPersonality2() : 
                "You are a friendly radio DJ.";
            default -> "You are a friendly radio DJ.";
        };
    }
    
    /**
     * Obtiene las voces configuradas.
     */
    public String[] getVoices() {
        RadioConfig config = radioConfigRepository.getConfig();
        if (Boolean.TRUE.equals(config.getDualMode()) && config.getVoice2() != null) {
            return new String[] { config.getVoice1(), config.getVoice2() };
        }
        return new String[] { config.getVoice1() };
    }
    
    /**
     * Obtiene el nombre del DJ 1.
     * Si no está configurado, usa el nombre de la voz.
     */
    public String getDjName1() {
        RadioConfig config = radioConfigRepository.getConfig();
        if (config.getDjName1() != null && !config.getDjName1().isBlank()) {
            return config.getDjName1();
        }
        // Usar nombre de la voz (formato: "af_bella" -> "Bella")
        return extractVoiceName(config.getVoice1());
    }
    
    /**
     * Obtiene el nombre del DJ 2.
     * Si no está configurado, usa el nombre de la voz.
     */
    public String getDjName2() {
        RadioConfig config = radioConfigRepository.getConfig();
        if (config.getDjName2() != null && !config.getDjName2().isBlank()) {
            return config.getDjName2();
        }
        // Usar nombre de la voz
        return extractVoiceName(config.getVoice2());
    }
    
    /**
     * Extrae el nombre de la voz del ID (ej: "af_bella" -> "Bella").
     */
    private String extractVoiceName(String voiceId) {
        if (voiceId == null) return "DJ";
        // Formato: "af_bella", "am_michael", etc.
        String[] parts = voiceId.split("_");
        if (parts.length >= 2) {
            String name = parts[1];
            // Capitalizar primera letra
            return name.substring(0, 1).toUpperCase() + name.substring(1);
        }
        return voiceId;
    }
    
    /**
     * Verifica si el modo dúo está activo.
     */
    public boolean isDualMode() {
        RadioConfig config = radioConfigRepository.getConfig();
        return Boolean.TRUE.equals(config.getDualMode()) && config.getVoice2() != null;
    }
    
    // ========== PERSISTENCE HELPERS ==========
    
    /**
     * Carga la memoria desde la BD.
     * Se llama al iniciar el servicio.
     */
    private void loadMemoryFromDb() {
        try {
            RadioConfig config = radioConfigRepository.getConfig();
            
            // Solo cargar si el radio está activo
            if (!Boolean.TRUE.equals(config.getEnabled())) {
                log.debug("Radio disabled, skipping memory load");
                return;
            }
            
            // Cargar scripts
            if (config.getScriptHistory() != null && !config.getScriptHistory().isBlank()) {
                List<String> scripts = objectMapper.readValue(
                    config.getScriptHistory(), 
                    new TypeReference<List<String>>() {}
                );
                sessionMemory.setScriptHistory(new LinkedList<>(scripts));
            }
            
            // Cargar canciones anteriores
            if (config.getPreviousSongs() != null && !config.getPreviousSongs().isBlank()) {
                List<String> songs = objectMapper.readValue(
                    config.getPreviousSongs(), 
                    new TypeReference<List<String>>() {}
                );
                sessionMemory.setPreviousSongs(new LinkedList<>(songs));
            }
            
            // Cargar identidad
            if (config.getSessionIdentity() != null && !config.getSessionIdentity().isBlank()) {
                RadioMemory.RadioIdentity identity = objectMapper.readValue(
                    config.getSessionIdentity(), 
                    RadioMemory.RadioIdentity.class
                );
                sessionMemory.setIdentity(identity);
            }
            
            // Cargar contador
            if (config.getAnnouncementCount() != null) {
                sessionMemory.setAnnouncementCount(config.getAnnouncementCount());
            }
            
            log.info("Radio memory loaded from DB: {} scripts, {} songs, identity={}",
                sessionMemory.getScriptHistory().size(),
                sessionMemory.getPreviousSongs().size(),
                sessionMemory.getIdentity() != null ? sessionMemory.getIdentity().getSessionName() : "null");
                
        } catch (Exception e) {
            log.error("Error loading radio memory from DB", e);
            sessionMemory = new RadioMemory();
        }
    }
    
    /**
     * Persiste la memoria actual en la BD.
     */
    private void persistMemoryToDb() {
        try {
            RadioConfig config = radioConfigRepository.getConfig();
            
            // Serializar scripts
            if (!sessionMemory.getScriptHistory().isEmpty()) {
                config.setScriptHistory(objectMapper.writeValueAsString(sessionMemory.getScriptHistory()));
            } else {
                config.setScriptHistory(null);
            }
            
            // Serializar canciones
            if (!sessionMemory.getPreviousSongs().isEmpty()) {
                config.setPreviousSongs(objectMapper.writeValueAsString(sessionMemory.getPreviousSongs()));
            } else {
                config.setPreviousSongs(null);
            }
            
            // Serializar identidad
            if (sessionMemory.getIdentity() != null) {
                config.setSessionIdentity(objectMapper.writeValueAsString(sessionMemory.getIdentity()));
            } else {
                config.setSessionIdentity(null);
            }
            
            // Contador
            config.setAnnouncementCount(sessionMemory.getAnnouncementCount());
            
            radioConfigRepository.save(config);
            log.debug("Radio memory persisted to DB");
            
        } catch (JsonProcessingException e) {
            log.error("Error persisting radio memory to DB", e);
        }
    }
}
