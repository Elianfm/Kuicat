package com.kuicat.app.dto;

import lombok.*;
import java.util.List;

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
    private Integer previousRankPosition;
    
    // === Canción siguiente ===
    private String nextTitle;
    private String nextArtist;
    private String nextAlbum;
    private String nextGenre;
    private Integer nextYear;
    private String nextDescription;
    private Integer nextRankPosition;
    
    // === Historial de canciones ===
    /** Canciones reproducidas anteriormente (formato: "Título - Artista") */
    private List<String> previousSongs;
    
    /** Próximas canciones en cola (formato: "Título - Artista") */
    private List<String> upcomingSongs;
    
    // === Contexto adicional ===
    private Integer songsPlayedCount;  // Canciones reproducidas en esta sesión
    private Integer sessionMinutes;    // Minutos de sesión
}
