package com.kuicat.app.dto;

import lombok.*;

/**
 * Contexto para generar el script del locutor.
 * El frontend envía esto al solicitar un anuncio.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RadioContextDTO {
    
    // === Canción anterior ===
    private String previousTitle;
    private String previousArtist;
    private String previousAlbum;
    private String previousGenre;
    private Integer previousYear;
    private String previousDescription;
    
    // === Canción siguiente ===
    private String nextTitle;
    private String nextArtist;
    private String nextAlbum;
    private String nextGenre;
    private Integer nextYear;
    private String nextDescription;
    
    // === Contexto adicional ===
    private Integer songsPlayedCount;  // Canciones reproducidas en esta sesión
    private Integer sessionMinutes;    // Minutos de sesión
}
