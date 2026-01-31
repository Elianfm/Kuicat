package com.kuicat.app.dto;

import lombok.*;

/**
 * Respuesta del endpoint de generación de anuncio de radio.
 * Contiene el audio TTS y los parámetros de transición.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RadioAnnouncementDTO {
    
    /** URL del audio generado por TTS */
    private String audioUrl;
    
    /** Duración del audio en segundos */
    private Double duration;
    
    /** Script generado por el LLM (para debug/logs) */
    private String script;
    
    /** Parámetros de transición calculados dinámicamente */
    private TransitionParamsDTO transition;
}
