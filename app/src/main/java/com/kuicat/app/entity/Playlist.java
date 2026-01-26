package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad que representa una playlist.
 * Puede ser dinámica (filtrada por criterios) o manual (canciones seleccionadas).
 */
@Entity
@Table(name = "playlists")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Playlist {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    private String icon; // Material icon name (ej: "favorite", "work")
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PlaylistType type = PlaylistType.CUSTOM;
    
    /**
     * Criterios de filtrado para playlists dinámicas.
     * Formato JSON: {"genres": ["Rock"], "minRating": 7}
     */
    @Column(columnDefinition = "TEXT")
    private String filterCriteria;
    
    // === Timestamps ===
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * Tipos de playlist soportados.
     */
    public enum PlaylistType {
        CUSTOM,     // Canciones seleccionadas manualmente
        GENRE,      // Filtrada por género
        ARTIST,     // Filtrada por artista
        TAGS,       // Filtrada por etiquetas
        SMART       // Filtrada por criterios complejos
    }
}
