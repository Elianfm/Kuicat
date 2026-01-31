package com.kuicat.app.dto;

import lombok.*;

/**
 * Parámetros de transición para el Modo Radio.
 * Calculados dinámicamente según la duración del TTS.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransitionParamsDTO {
    
    /** Duración del fade out de la canción anterior (ms) */
    @Builder.Default
    private Integer fadeOutDuration = 3000;
    
    /** Silencio antes del TTS (ms) */
    @Builder.Default
    private Integer preSilence = 400;
    
    /** Silencio después del TTS (ms) */
    @Builder.Default
    private Integer postSilence = 400;
    
    /** Duración del fade in de la siguiente canción (ms) */
    @Builder.Default
    private Integer fadeInDuration = 2000;
}
