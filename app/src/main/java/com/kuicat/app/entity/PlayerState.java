package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Estado del reproductor para persistencia entre sesiones.
 * Singleton - solo existe un registro con id=1.
 */
@Entity
@Table(name = "player_state")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerState {
    
    @Id
    @Column(name = "id")
    private Long id = 1L; // Singleton
    
    // === Canción actual ===
    
    /** ID de la canción actual */
    @Column(name = "current_song_id")
    private Long currentSongId;
    
    /** Posición de reproducción en segundos */
    @Column(name = "queue_position")
    @Builder.Default
    private Double queuePosition = 0.0;
    
    /** Volumen (0.0 - 1.0) */
    @Column(name = "volume")
    @Builder.Default
    private Double volume = 0.5;
    
    /** ¿Estaba reproduciendo? */
    @Column(name = "is_playing")
    @Builder.Default
    private Boolean isPlaying = false;
    
    // === Cola de reproducción ===
    
    /** IDs de canciones en la cola (JSON array) */
    @Column(name = "queue_song_ids", columnDefinition = "TEXT")
    private String queueSongIds;
    
    /** Índice actual en la cola */
    @Column(name = "queue_index")
    @Builder.Default
    private Integer queueIndex = 0;
    
    /** ID de la playlist fuente (null = biblioteca) */
    @Column(name = "playlist_id")
    private Long playlistId;
    
    // === Modos de reproducción ===
    
    /** Modo shuffle activo */
    @Column(name = "shuffle_mode")
    @Builder.Default
    private Boolean shuffleMode = false;
    
    /** Modo repeat: none, one, all */
    @Column(name = "repeat_mode", length = 10)
    @Builder.Default
    private String repeatMode = "none";
    
    /** Filtro de ranking activo */
    @Column(name = "ranking_filter", length = 50)
    private String rankingFilter;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
