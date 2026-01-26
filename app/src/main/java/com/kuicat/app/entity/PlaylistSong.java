package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Tabla intermedia para la relación muchos-a-muchos entre Playlist y Song.
 * Permite ordenar las canciones dentro de una playlist.
 */
@Entity
@Table(name = "playlist_songs", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"playlist_id", "song_id"}),
       indexes = {
           @Index(name = "idx_playlist_song_playlist", columnList = "playlist_id"),
           @Index(name = "idx_playlist_song_order", columnList = "playlist_id, order_index")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistSong {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", nullable = false)
    private Playlist playlist;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;
    
    /**
     * Posición de la canción en la playlist.
     * Permite reordenar canciones sin eliminar y re-agregar.
     */
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
    
    /**
     * Fecha en que se añadió a la playlist.
     */
    @Column(name = "added_at", nullable = false)
    private java.time.LocalDateTime addedAt;
    
    @PrePersist
    protected void onCreate() {
        if (addedAt == null) {
            addedAt = java.time.LocalDateTime.now();
        }
    }
}
