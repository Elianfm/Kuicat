package com.kuicat.app.dto;

import lombok.*;
import java.util.List;

/**
 * Criterios de filtrado para búsqueda de canciones.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongFilterCriteria {
    private String query;           // Búsqueda en título, artista, álbum
    private String artist;          // Filtrar por artista exacto
    private String album;           // Filtrar por álbum exacto
    private String genre;           // Filtrar por género exacto
    private Integer minRating;      // Rating mínimo (1-10)
    private Integer maxRating;      // Rating máximo (1-10)
    private Boolean hasLyrics;      // Solo con/sin letras
    private Boolean hasNotes;       // Solo con/sin notas
    private List<Long> ids;         // Lista de IDs específicos
}
