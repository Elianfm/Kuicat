package com.kuicat.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para representar una categoría (artista o género) con su conteo de canciones.
 * Usado para la funcionalidad de "Playlist Rápida".
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryCountDTO {
    
    /**
     * Nombre de la categoría (nombre del artista o género)
     */
    private String name;
    
    /**
     * Número de canciones en esta categoría
     */
    private long count;
}
