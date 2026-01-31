package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Configuración del Modo Radio IA.
 * Singleton - solo existe un registro con id=1.
 */
@Entity
@Table(name = "radio_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RadioConfig {
    
    @Id
    @Column(name = "id")
    private Long id = 1L; // Singleton
    
    // === Básico ===
    
    /** Nombre de la radio (ej: "Radio Kuicat FM") */
    @Column(name = "radio_name", length = 100)
    @Builder.Default
    private String radioName = "Radio Kuicat FM";
    
    /** Nombre del usuario para saludos personalizados (opcional) */
    @Column(name = "user_name", length = 50)
    private String userName;
    
    /** Cada cuántas canciones habla el locutor */
    @Column(name = "frequency")
    @Builder.Default
    private Integer frequency = 3;
    
    // === Personalidad ===
    
    /** Tipo de personalidad: energetic, classic, casual, critic, nostalgic, custom */
    @Column(name = "personality", length = 50)
    @Builder.Default
    private String personality = "energetic";
    
    /** Personalidad custom definida por el usuario */
    @Column(name = "custom_personality", length = 500)
    private String customPersonality;
    
    /** Tipo de personalidad para el segundo host (modo dual) */
    @Column(name = "personality2", length = 50)
    @Builder.Default
    private String personality2 = "casual";
    
    /** Personalidad custom para el segundo host */
    @Column(name = "custom_personality2", length = 500)
    private String customPersonality2;
    
    // === Voces (Kokoro TTS) ===
    
    /** Voz principal del locutor */
    @Column(name = "voice1", length = 30)
    @Builder.Default
    private String voice1 = "af_bella";
    
    /** Voz secundaria para modo dúo (opcional) */
    @Column(name = "voice2", length = 30)
    private String voice2;
    
    /** ¿Modo dúo activado? (2 locutores) */
    @Column(name = "dual_mode")
    @Builder.Default
    private Boolean dualMode = false;
    
    // === Efectos ===
    
    /** ¿Generar jingle con el nombre de la radio? */
    @Column(name = "enable_jingles")
    @Builder.Default
    private Boolean enableJingles = false;
    
    /** ¿Efectos de transición (fade in/out)? */
    @Column(name = "enable_effects")
    @Builder.Default
    private Boolean enableEffects = true;
    
    // === Estado ===
    
    /** ¿Modo radio activo? */
    @Column(name = "enabled")
    @Builder.Default
    private Boolean enabled = false;
    
    /** Contador de canciones reproducidas desde último anuncio */
    @Column(name = "song_counter")
    @Builder.Default
    private Integer songCounter = 0;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
