package com.kuicat.app.service;

import com.kuicat.app.dto.RadioConfigDTO;
import com.kuicat.app.dto.TransitionParamsDTO;
import com.kuicat.app.entity.RadioConfig;
import com.kuicat.app.mapper.RadioConfigMapper;
import com.kuicat.app.repository.RadioConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio para gestionar el Modo Radio IA.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    
    private final RadioConfigRepository radioConfigRepository;
    private final RadioConfigMapper radioConfigMapper;
    
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
        }
        RadioConfig saved = radioConfigRepository.save(config);
        log.info("Radio mode toggled: enabled={}", saved.getEnabled());
        return radioConfigMapper.toDTO(saved);
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
     * Verifica si el modo dúo está activo.
     */
    public boolean isDualMode() {
        RadioConfig config = radioConfigRepository.getConfig();
        return Boolean.TRUE.equals(config.getDualMode()) && config.getVoice2() != null;
    }
}
