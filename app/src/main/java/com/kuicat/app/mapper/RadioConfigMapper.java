package com.kuicat.app.mapper;

import com.kuicat.app.dto.RadioConfigDTO;
import com.kuicat.app.entity.RadioConfig;
import org.springframework.stereotype.Component;

/**
 * Mapper para RadioConfig.
 */
@Component
public class RadioConfigMapper {
    
    public RadioConfigDTO toDTO(RadioConfig entity) {
        if (entity == null) return null;
        
        return RadioConfigDTO.builder()
                .radioName(entity.getRadioName())
                .userName(entity.getUserName())
                .frequency(entity.getFrequency())
                .personality(entity.getPersonality())
                .customPersonality(entity.getCustomPersonality())
                .personality2(entity.getPersonality2())
                .customPersonality2(entity.getCustomPersonality2())
                .voice1(entity.getVoice1())
                .voice2(entity.getVoice2())
                .dualMode(entity.getDualMode())
                .enableJingles(entity.getEnableJingles())
                .enableEffects(entity.getEnableEffects())
                .enabled(entity.getEnabled())
                .songCounter(entity.getSongCounter())
                .build();
    }
    
    public void updateEntity(RadioConfig entity, RadioConfigDTO dto) {
        if (dto.getRadioName() != null) entity.setRadioName(dto.getRadioName());
        if (dto.getUserName() != null) entity.setUserName(dto.getUserName());
        if (dto.getFrequency() != null) entity.setFrequency(dto.getFrequency());
        if (dto.getPersonality() != null) entity.setPersonality(dto.getPersonality());
        if (dto.getCustomPersonality() != null) entity.setCustomPersonality(dto.getCustomPersonality());
        if (dto.getPersonality2() != null) entity.setPersonality2(dto.getPersonality2());
        if (dto.getCustomPersonality2() != null) entity.setCustomPersonality2(dto.getCustomPersonality2());
        if (dto.getVoice1() != null) entity.setVoice1(dto.getVoice1());
        if (dto.getVoice2() != null) entity.setVoice2(dto.getVoice2());
        if (dto.getDualMode() != null) entity.setDualMode(dto.getDualMode());
        if (dto.getEnableJingles() != null) entity.setEnableJingles(dto.getEnableJingles());
        if (dto.getEnableEffects() != null) entity.setEnableEffects(dto.getEnableEffects());
        if (dto.getEnabled() != null) entity.setEnabled(dto.getEnabled());
        // songCounter se maneja internamente
    }
}
