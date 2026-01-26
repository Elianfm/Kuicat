package com.kuicat.app.controller;

import com.kuicat.app.repository.SongRepository;
import com.kuicat.app.repository.PlaylistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Controlador para información general y estado de la aplicación.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppController {
    
    private final SongRepository songRepository;
    private final PlaylistRepository playlistRepository;
    
    @Value("${kuicat.music.folder:}")
    private String musicFolder;
    
    @Value("${kuicat.video.folder:}")
    private String videoFolder;
    
    /**
     * Health check endpoint.
     * 
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "Kuicat API");
        return ResponseEntity.ok(response);
    }
    
    /**
     * Estadísticas generales de la biblioteca.
     * 
     * GET /api/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Map<String, Object> response = new HashMap<>();
        response.put("totalSongs", songRepository.count());
        response.put("totalPlaylists", playlistRepository.count());
        response.put("totalArtists", songRepository.findAllArtists().size());
        response.put("totalAlbums", songRepository.findAllAlbums().size());
        response.put("totalGenres", songRepository.findAllGenres().size());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Obtiene la configuración actual.
     * 
     * GET /api/config
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> response = new HashMap<>();
        response.put("musicFolder", musicFolder);
        response.put("videoFolder", videoFolder);
        return ResponseEntity.ok(response);
    }
}
