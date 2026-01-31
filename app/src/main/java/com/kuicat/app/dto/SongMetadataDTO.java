package com.kuicat.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para metadata de canción generada por IA.
 * Usado por MetadataAIService para parsear la respuesta de OpenAI.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongMetadataDTO {
    
    private String title;
    private String artist;
    private String album;
    private String genre;
    private Integer year;
    private String description;
}
