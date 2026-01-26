package com.kuicat.app.dto;

import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO para transferir datos de Song al frontend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongDTO {
    private Long id;
    private String filePath;
    
    // Metadata
    private String title;
    private String artist;
    private String album;
    private Integer year;
    private String genre;
    private Integer duration;
    
    // Datos del usuario
    private String description;
    private Integer rating;
    private Integer ranking;      // Ranking interno (con gaps), null = sin rankear
    private Integer rankPosition; // Posición visual 1, 2, 3... (calculada)
    private Integer playCount;
    private LocalDateTime lastPlayed;
    private String notes;
    private String lyrics;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
