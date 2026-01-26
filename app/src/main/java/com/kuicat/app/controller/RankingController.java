package com.kuicat.app.controller;

import com.kuicat.app.dto.SongDTO;
import com.kuicat.app.entity.Song;
import com.kuicat.app.mapper.EntityMapper;
import com.kuicat.app.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Controlador para gestión del ranking personal de canciones.
 * Base path: /api/ranking
 */
@RestController
@RequestMapping("/api/ranking")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RankingController {
    
    private final RankingService rankingService;
    private final EntityMapper entityMapper;
    
    /**
     * Obtiene las canciones ordenadas por ranking.
     * Las rankeadas primero (1, 2, 3...), luego las sin rankear.
     * 
     * GET /api/ranking
     */
    @GetMapping
    public ResponseEntity<List<SongDTO>> getRankedSongs() {
        List<Song> songs = rankingService.getRankedSongs();
        
        // Calcular posición visual para cada canción
        AtomicInteger position = new AtomicInteger(1);
        List<SongDTO> dtos = songs.stream()
                .map(song -> {
                    SongDTO dto = entityMapper.toSongDTO(song);
                    if (song.getRanking() != null) {
                        dto.setRankPosition(position.getAndIncrement());
                    }
                    return dto;
                })
                .toList();
        
        return ResponseEntity.ok(dtos);
    }
    
    /**
     * Añade una canción al ranking en una posición específica.
     * 
     * POST /api/ranking/{songId}
     * Body: { "position": 1 }
     */
    @PostMapping("/{songId}")
    public ResponseEntity<SongDTO> addToRanking(
            @PathVariable Long songId,
            @RequestBody Map<String, Integer> request
    ) {
        int position = request.getOrDefault("position", Integer.MAX_VALUE);
        Song song = rankingService.addToRanking(songId, position);
        
        SongDTO dto = entityMapper.toSongDTO(song);
        dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
        
        return ResponseEntity.ok(dto);
    }
    
    /**
     * Mueve una canción a una nueva posición en el ranking.
     * 
     * PUT /api/ranking/{songId}
     * Body: { "position": 3 }
     */
    @PutMapping("/{songId}")
    public ResponseEntity<SongDTO> moveInRanking(
            @PathVariable Long songId,
            @RequestBody Map<String, Integer> request
    ) {
        int position = request.get("position");
        Song song = rankingService.moveInRanking(songId, position);
        
        SongDTO dto = entityMapper.toSongDTO(song);
        dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
        
        return ResponseEntity.ok(dto);
    }
    
    /**
     * Quita una canción del ranking.
     * 
     * DELETE /api/ranking/{songId}
     */
    @DeleteMapping("/{songId}")
    public ResponseEntity<SongDTO> removeFromRanking(@PathVariable Long songId) {
        Song song = rankingService.removeFromRanking(songId);
        return ResponseEntity.ok(entityMapper.toSongDTO(song));
    }
}
