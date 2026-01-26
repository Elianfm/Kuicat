package com.kuicat.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad que representa una canción en la biblioteca.
 * Almacena tanto metadata del archivo como datos personalizados del usuario.
 */
@Entity
@Table(name = "songs", indexes = {
    @Index(name = "idx_file_path", columnList = "filePath"),
    @Index(name = "idx_file_hash", columnList = "fileHash"),
    @Index(name = "idx_artist", columnList = "artist"),
    @Index(name = "idx_album", columnList = "album"),
    @Index(name = "idx_genre", columnList = "genre"),
    @Index(name = "idx_year", columnList = "year"),
    @Index(name = "idx_ranking", columnList = "ranking")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Song {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // === Información del archivo ===
    
    @Column(nullable = false, unique = true)
    private String filePath;
    
    @Column(nullable = false)
    private String fileHash; // Hash MD5 para detectar duplicados/movimientos
    
    private String format;      // mp3, flac, wav, etc.
    
    private Integer bitrate;    // en kbps
    
    private Integer sampleRate; // en Hz
    
    // === Metadata estándar (leída del archivo) ===
    
    @Column(nullable = false)
    private String title;
    
    private String artist;
    
    private String albumArtist; // Artista del álbum (puede diferir)
    
    private String album;
    
    private Integer year;       // Año de lanzamiento
    
    private Integer trackNumber; // Número de pista
    
    private Integer discNumber;  // Número de disco
    
    private String genre;
    
    private String composer;     // Compositor
    
    private Integer duration;    // en segundos
    
    private String coverPath;    // Ruta a la carátula extraída
    
    // === Datos personalizados del usuario ===
    
    @Column(columnDefinition = "TEXT")
    private String description;  // Descripción/comentarios del usuario
    
    @Column(columnDefinition = "INTEGER DEFAULT 0")
    @Builder.Default
    private Integer rating = 0; // 1-10, 0 = sin calificar
    
    /**
     * Ranking personal del usuario (posición interna con gaps).
     * null = sin rankear (aparece al final)
     * Usa gaps de 1000 para inserciones eficientes.
     * En UI se muestra como 1, 2, 3...
     */
    private Integer ranking; // null = sin rankear, menor número = más favorita
    
    @Column(columnDefinition = "INTEGER DEFAULT 0")
    @Builder.Default
    private Integer playCount = 0;
    
    private LocalDateTime lastPlayed;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(columnDefinition = "TEXT")
    private String lyrics;
    
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
}
