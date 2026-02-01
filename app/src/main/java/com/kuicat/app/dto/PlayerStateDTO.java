package com.kuicat.app.dto;

import lombok.*;
import java.util.List;

/**
 * DTO para el estado del reproductor.
 * Se usa para guardar/restaurar el estado entre sesiones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerStateDTO {
    
    // === Canción actual ===
    private Long currentSongId;
    private Double queuePosition;  // Posición en segundos
    private Double volume;         // 0.0 - 1.0
    private Boolean isPlaying;
    
    // === Cola de reproducción ===
    private List<Long> queueSongIds;
    private Integer queueIndex;
    private Long playlistId;       // null = biblioteca
    
    // === Modos de reproducción ===
    private Boolean shuffleMode;
    private String repeatMode;     // none, one, all
    private String rankingFilter;
}
