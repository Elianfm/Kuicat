package com.kuicat.app.controller;

import com.kuicat.app.dto.*;
import com.kuicat.app.service.SongService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión de canciones.
 * Base path: /api/songs
 */
@RestController
@RequestMapping("/api/songs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Se configurará mejor en producción
public class SongController {
    
    private final SongService songService;
    
    // ==================== CONSULTAS ====================
    
    /**
     * Obtiene todas las canciones con paginación, filtros y ordenamiento.
     * 
     * GET /api/songs?page=0&size=50&sortBy=title&sortDir=asc
     * GET /api/songs?query=rock&artist=Queen&minRating=7
     */
    @GetMapping
    public ResponseEntity<PageResponse<SongDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            // Filtros opcionales
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String artist,
            @RequestParam(required = false) String album,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @RequestParam(required = false) Boolean hasLyrics,
            @RequestParam(required = false) Boolean hasNotes,
            @RequestParam(required = false) List<Long> ids
    ) {
        SongFilterCriteria filter = SongFilterCriteria.builder()
                .query(query)
                .artist(artist)
                .album(album)
                .genre(genre)
                .minRating(minRating)
                .maxRating(maxRating)
                .hasLyrics(hasLyrics)
                .hasNotes(hasNotes)
                .ids(ids)
                .build();
        
        return ResponseEntity.ok(songService.findAll(filter, page, size, sortBy, sortDir));
    }
    
    /**
     * Obtiene una canción por ID.
     * 
     * GET /api/songs/123
     */
    @GetMapping("/{id}")
    public ResponseEntity<SongDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(songService.findById(id));
    }
    
    /**
     * Búsqueda rápida por texto.
     * 
     * GET /api/songs/search?q=bohemian
     */
    @GetMapping("/search")
    public ResponseEntity<List<SongDTO>> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(songService.search(query));
    }
    
    /**
     * Obtiene todos los artistas únicos.
     * 
     * GET /api/songs/artists
     */
    @GetMapping("/artists")
    public ResponseEntity<List<String>> getArtists() {
        return ResponseEntity.ok(songService.getAllArtists());
    }
    
    /**
     * Obtiene todos los álbumes únicos.
     * 
     * GET /api/songs/albums
     */
    @GetMapping("/albums")
    public ResponseEntity<List<String>> getAlbums() {
        return ResponseEntity.ok(songService.getAllAlbums());
    }
    
    /**
     * Obtiene todos los géneros únicos.
     * 
     * GET /api/songs/genres
     */
    @GetMapping("/genres")
    public ResponseEntity<List<String>> getGenres() {
        return ResponseEntity.ok(songService.getAllGenres());
    }
    
    // ==================== QUICK PLAYLIST ====================
    
    /**
     * Obtiene todos los artistas con el conteo de canciones.
     * 
     * GET /api/songs/artists/count
     */
    @GetMapping("/artists/count")
    public ResponseEntity<List<CategoryCountDTO>> getArtistsWithCount() {
        return ResponseEntity.ok(songService.getArtistsWithCount());
    }
    
    /**
     * Obtiene todos los géneros con el conteo de canciones.
     * 
     * GET /api/songs/genres/count
     */
    @GetMapping("/genres/count")
    public ResponseEntity<List<CategoryCountDTO>> getGenresWithCount() {
        return ResponseEntity.ok(songService.getGenresWithCount());
    }
    
    /**
     * Obtiene canciones de un artista específico.
     * 
     * GET /api/songs/by-artist?name=Daft%20Punk
     */
    @GetMapping("/by-artist")
    public ResponseEntity<List<SongDTO>> getSongsByArtist(@RequestParam("name") String artist) {
        return ResponseEntity.ok(songService.getSongsByArtist(artist));
    }
    
    /**
     * Obtiene canciones de un género específico.
     * 
     * GET /api/songs/by-genre?name=Rock
     */
    @GetMapping("/by-genre")
    public ResponseEntity<List<SongDTO>> getSongsByGenre(@RequestParam("name") String genre) {
        return ResponseEntity.ok(songService.getSongsByGenre(genre));
    }
    
    /**
     * Obtiene las canciones más reproducidas.
     * 
     * GET /api/songs/most-played
     */
    @GetMapping("/most-played")
    public ResponseEntity<List<SongDTO>> getMostPlayed() {
        return ResponseEntity.ok(songService.getMostPlayed());
    }
    
    /**
     * Obtiene las canciones reproducidas recientemente.
     * 
     * GET /api/songs/recently-played
     */
    @GetMapping("/recently-played")
    public ResponseEntity<List<SongDTO>> getRecentlyPlayed() {
        return ResponseEntity.ok(songService.getRecentlyPlayed());
    }
    
    // ==================== MODIFICACIONES ====================
    
    /**
     * Actualiza los datos editables de una canción (actualización completa).
     * 
     * PUT /api/songs/123
     * Body: { "title": "Nuevo título", "rating": 8 }
     */
    @PutMapping("/{id}")
    public ResponseEntity<SongDTO> update(
            @PathVariable Long id,
            @RequestBody SongUpdateDTO updateDTO
    ) {
        return ResponseEntity.ok(songService.update(id, updateDTO));
    }
    
    /**
     * Actualiza parcialmente los datos de una canción.
     * 
     * PATCH /api/songs/123
     * Body: { "title": "Nuevo título" } o { "rating": 8 } o cualquier campo
     */
    @PatchMapping("/{id}")
    public ResponseEntity<SongDTO> partialUpdate(
            @PathVariable Long id,
            @RequestBody SongUpdateDTO updateDTO
    ) {
        return ResponseEntity.ok(songService.update(id, updateDTO));
    }
    
    /**
     * Registra una reproducción de la canción.
     * 
     * POST /api/songs/123/play
     */
    @PostMapping("/{id}/play")
    public ResponseEntity<SongDTO> recordPlay(@PathVariable Long id) {
        return ResponseEntity.ok(songService.recordPlay(id));
    }
    
    /**
     * Actualiza las letras de una canción.
     * 
     * PUT /api/songs/123/lyrics
     * Body: { "lyrics": "Letra de la canción..." }
     */
    @PutMapping("/{id}/lyrics")
    public ResponseEntity<SongDTO> updateLyrics(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String lyrics = body.get("lyrics");
        return ResponseEntity.ok(songService.updateLyrics(id, lyrics));
    }
    
    /**
     * Actualiza las notas de una canción.
     * 
     * PUT /api/songs/123/notes
     * Body: { "notes": "Mis notas..." }
     */
    @PutMapping("/{id}/notes")
    public ResponseEntity<SongDTO> updateNotes(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String notes = body.get("notes");
        return ResponseEntity.ok(songService.updateNotes(id, notes));
    }
}
