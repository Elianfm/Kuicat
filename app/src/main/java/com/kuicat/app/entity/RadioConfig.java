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
    
    /** Nombre del DJ 1 (opcional, por defecto usa el nombre de la voz) */
    @Column(name = "dj_name1", length = 50)
    private String djName1;
    
    /** Voz secundaria para modo dúo (opcional) */
    @Column(name = "voice2", length = 30)
    private String voice2;
    
    /** Nombre del DJ 2 (opcional, por defecto usa el nombre de la voz) */
    @Column(name = "dj_name2", length = 50)
    private String djName2;
    
    /** ¿Modo dúo activado? (2 locutores) */
    @Column(name = "dual_mode")
    @Builder.Default
    private Boolean dualMode = false;
    
    // === Instrucciones personalizadas ===
    
    /** Instrucciones del usuario para la narrativa/estilo del DJ (opcional) */
    @Column(name = "user_instructions", length = 1000)
    private String userInstructions;
    
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
    
    // === Memoria de sesión (persistida) ===
    
    /** Historial de scripts del DJ (JSON array) */
    @Column(name = "script_history", columnDefinition = "TEXT")
    private String scriptHistory;
    
    /** Historial de canciones reproducidas (JSON array) */
    @Column(name = "previous_songs", columnDefinition = "TEXT")
    private String previousSongs;
    
    /** Identidad de sesión (JSON object) */
    @Column(name = "session_identity", columnDefinition = "TEXT")
    private String sessionIdentity;
    
    /** Contador de anuncios en la sesión */
    @Column(name = "announcement_count")
    @Builder.Default
    private Integer announcementCount = 0;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
