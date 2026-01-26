package com.kuicat.app.service;

import com.kuicat.app.entity.Song;
import com.kuicat.app.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio para gestionar el ranking personal de canciones.
 * Usa gaps de 1000 para inserciones eficientes O(1).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RankingService {
    
    private final SongRepository songRepository;
    
    private static final int GAP_SIZE = 1000;
    private static final int INITIAL_RANK = 1000;
    
    /**
     * Añade una canción al ranking en una posición específica.
     * 
     * @param songId ID de la canción
     * @param position Posición deseada (1 = primera, 2 = segunda, etc.)
     * @return La canción actualizada
     */
    @Transactional
    public Song addToRanking(Long songId, int position) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new RuntimeException("Canción no encontrada: " + songId));
        
        List<Song> rankedSongs = songRepository.findByRankingNotNullOrderByRankingAsc();
        
        if (rankedSongs.isEmpty()) {
            // Primera canción en el ranking
            song.setRanking(INITIAL_RANK);
            log.info("Primera canción en ranking: {} -> rank {}", song.getTitle(), INITIAL_RANK);
            return songRepository.save(song);
        }
        
        // Posición válida: 1 a (tamaño + 1)
        int maxPosition = rankedSongs.size() + 1;
        position = Math.max(1, Math.min(position, maxPosition));
        
        int newRank;
        
        if (position == 1) {
            // Insertar al principio
            int firstRank = rankedSongs.get(0).getRanking();
            newRank = firstRank > GAP_SIZE ? firstRank - GAP_SIZE : firstRank / 2;
            if (newRank <= 0) {
                rebalance(rankedSongs);
                return addToRanking(songId, position);
            }
        } else if (position > rankedSongs.size()) {
            // Insertar al final
            int lastRank = rankedSongs.get(rankedSongs.size() - 1).getRanking();
            newRank = lastRank + GAP_SIZE;
        } else {
            // Insertar entre dos posiciones
            int prevRank = rankedSongs.get(position - 2).getRanking();
            int nextRank = rankedSongs.get(position - 1).getRanking();
            
            if (nextRank - prevRank <= 1) {
                // No hay espacio, rebalancear
                rebalance(rankedSongs);
                return addToRanking(songId, position);
            }
            
            newRank = prevRank + (nextRank - prevRank) / 2;
        }
        
        song.setRanking(newRank);
        log.info("Canción añadida al ranking pos {}: {} -> rank {}", position, song.getTitle(), newRank);
        return songRepository.save(song);
    }
    
    /**
     * Mueve una canción a una nueva posición en el ranking.
     */
    @Transactional
    public Song moveInRanking(Long songId, int newPosition) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new RuntimeException("Canción no encontrada: " + songId));
        
        // Quitar del ranking actual
        song.setRanking(null);
        songRepository.save(song);
        
        // Añadir en nueva posición
        return addToRanking(songId, newPosition);
    }
    
    /**
     * Quita una canción del ranking.
     */
    @Transactional
    public Song removeFromRanking(Long songId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new RuntimeException("Canción no encontrada: " + songId));
        
        song.setRanking(null);
        log.info("Canción quitada del ranking: {}", song.getTitle());
        return songRepository.save(song);
    }
    
    /**
     * Obtiene las canciones ordenadas por ranking (favoritas primero).
     * Las canciones sin ranking aparecen al final.
     */
    public List<Song> getRankedSongs() {
        return songRepository.findAllOrderByRankingNullsLast();
    }
    
    /**
     * Calcula la posición visual (1, 2, 3...) para un ranking interno.
     */
    public int calculatePosition(Integer ranking) {
        if (ranking == null) return -1;
        
        List<Song> rankedSongs = songRepository.findByRankingNotNullOrderByRankingAsc();
        for (int i = 0; i < rankedSongs.size(); i++) {
            if (rankedSongs.get(i).getRanking().equals(ranking)) {
                return i + 1;
            }
        }
        return -1;
    }
    
    /**
     * Rebalancea los rankings para crear nuevos gaps.
     */
    private void rebalance(List<Song> songs) {
        log.info("Rebalanceando {} canciones en el ranking", songs.size());
        
        for (int i = 0; i < songs.size(); i++) {
            songs.get(i).setRanking((i + 1) * GAP_SIZE);
        }
        
        songRepository.saveAll(songs);
        log.info("Rebalanceo completado");
    }
}
