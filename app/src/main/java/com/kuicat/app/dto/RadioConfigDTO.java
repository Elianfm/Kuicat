package com.kuicat.app.dto;

import lombok.*;

/**
 * DTO para configuración del Modo Radio IA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RadioConfigDTO {
    
    // === Básico ===
    private String radioName;
    private String userName;
    private Integer frequency;
    
    // === Personalidad ===
    private String personality;
    private String customPersonality;
    
    // === Personalidad Host 2 (modo dual) ===
    private String personality2;
    private String customPersonality2;
    
    // === Instrucciones personalizadas ===
    private String userInstructions;
    
    // === Voces ===
    private String voice1;
    private String djName1;
    private String voice2;
    private String djName2;
    private Boolean dualMode;
    
    // === Efectos ===
    private Boolean enableJingles;
    private Boolean enableEffects;
    
    // === Estado ===
    private Boolean enabled;
    private Integer songCounter;
}
