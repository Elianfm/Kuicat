package com.kuicat.app.controller;

import com.kuicat.app.dto.*;
import com.kuicat.app.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión de playlists.
 * Base path: /api/playlists
 */
@RestController
@RequestMapping("/api/playlists")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PlaylistController {
    
    private final PlaylistService playlistService;
    
    // ==================== CONSULTAS ====================
    
    /**
     * Obtiene todas las playlists.
     * 
     * GET /api/playlists
     */
    @GetMapping
    public ResponseEntity<List<PlaylistDTO>> getAll() {
        return ResponseEntity.ok(playlistService.findAll());
    }
    
    /**
     * Obtiene una playlist por ID.
     * 
     * GET /api/playlists/123
     */
    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(playlistService.findById(id));
    }
    
    /**
     * Obtiene las canciones de una playlist.
     * 
     * GET /api/playlists/123/songs
     */
    @GetMapping("/{id}/songs")
    public ResponseEntity<List<SongDTO>> getPlaylistSongs(@PathVariable Long id) {
        return ResponseEntity.ok(playlistService.getPlaylistSongs(id));
    }
    
    // ==================== MODIFICACIONES ====================
    
    /**
     * Crea una nueva playlist.
     * 
     * POST /api/playlists
     * Body: { "name": "Mi Playlist", "icon": "favorite", "type": "CUSTOM" }
     */
    @PostMapping
    public ResponseEntity<PlaylistDTO> create(@RequestBody PlaylistCreateDTO dto) {
        PlaylistDTO created = playlistService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    /**
     * Actualiza una playlist.
     * 
     * PUT /api/playlists/123
     * Body: { "name": "Nuevo nombre" }
     */
    @PutMapping("/{id}")
    public ResponseEntity<PlaylistDTO> update(
            @PathVariable Long id,
            @RequestBody PlaylistCreateDTO dto
    ) {
        return ResponseEntity.ok(playlistService.update(id, dto));
    }
    
    /**
     * Elimina una playlist.
     * 
     * DELETE /api/playlists/123
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        playlistService.delete(id);
        return ResponseEntity.noContent().build();
    }
    
    // ==================== GESTIÓN DE CANCIONES ====================
    
    /**
     * Agrega una canción a la playlist.
     * 
     * POST /api/playlists/123/songs
     * Body: { "songId": 456 }
     */
    @PostMapping("/{id}/songs")
    public ResponseEntity<Void> addSong(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body
    ) {
        Long songId = body.get("songId");
        playlistService.addSong(id, songId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    
    /**
     * Agrega múltiples canciones a la playlist.
     * 
     * POST /api/playlists/123/songs/batch
     * Body: { "songIds": [1, 2, 3] }
     */
    @PostMapping("/{id}/songs/batch")
    public ResponseEntity<Void> addSongs(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        List<Long> songIds = body.get("songIds");
        playlistService.addSongsToPlaylist(id, songIds);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    
    /**
     * Elimina una canción de la playlist.
     * 
     * DELETE /api/playlists/123/songs/456
     */
    @DeleteMapping("/{id}/songs/{songId}")
    public ResponseEntity<Void> removeSong(
            @PathVariable Long id,
            @PathVariable Long songId
    ) {
        playlistService.removeSong(id, songId);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Reordena las canciones de la playlist.
     * 
     * PUT /api/playlists/123/songs/order
     * Body: { "songIds": [3, 1, 2] }
     */
    @PutMapping("/{id}/songs/order")
    public ResponseEntity<Void> reorderSongs(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        List<Long> songIds = body.get("songIds");
        playlistService.reorderSongs(id, songIds);
        return ResponseEntity.ok().build();
    }
}
