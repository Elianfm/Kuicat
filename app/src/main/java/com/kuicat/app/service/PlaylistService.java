package com.kuicat.app.service;

import com.kuicat.app.dto.*;
import com.kuicat.app.entity.*;
import com.kuicat.app.exception.BadRequestException;
import com.kuicat.app.exception.ResourceNotFoundException;
import com.kuicat.app.mapper.EntityMapper;
import com.kuicat.app.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio para gestión de playlists.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PlaylistService {
    
    private final PlaylistRepository playlistRepository;
    private final PlaylistSongRepository playlistSongRepository;
    private final SongRepository songRepository;
    private final EntityMapper mapper;
    
    // ==================== CONSULTAS ====================
    
    /**
     * Obtiene todas las playlists.
     */
    public List<PlaylistDTO> findAll() {
        return playlistRepository.findAllByOrderByNameAsc().stream()
                .map(this::toPlaylistDTOWithSongs)
                .toList();
    }
    
    /**
     * Obtiene una playlist por ID con sus canciones.
     */
    public PlaylistDTO findById(Long id) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Playlist", id));
        return toPlaylistDTOWithSongs(playlist);
    }
    
    /**
     * Obtiene las canciones de una playlist.
     */
    public List<SongDTO> getPlaylistSongs(Long playlistId) {
        if (!playlistRepository.existsById(playlistId)) {
            throw new ResourceNotFoundException("Playlist", playlistId);
        }
        
        List<Long> songIds = playlistSongRepository.findSongIdsByPlaylistId(playlistId);
        return songIds.stream()
                .map(id -> songRepository.findById(id).orElse(null))
                .filter(song -> song != null)
                .map(mapper::toSongDTO)
                .toList();
    }
    
    // ==================== MODIFICACIONES ====================
    
    /**
     * Crea una nueva playlist.
     */
    @Transactional
    public PlaylistDTO create(PlaylistCreateDTO dto) {
        // Validar nombre único
        if (playlistRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new BadRequestException("Ya existe una playlist con el nombre: " + dto.getName());
        }
        
        Playlist playlist = mapper.toPlaylistEntity(dto);
        Playlist saved = playlistRepository.save(playlist);
        
        // Agregar canciones iniciales si se proporcionan
        if (dto.getSongIds() != null && !dto.getSongIds().isEmpty()) {
            addSongsToPlaylist(saved.getId(), dto.getSongIds());
        }
        
        log.info("Playlist creada: {} ({})", saved.getName(), saved.getId());
        return toPlaylistDTOWithSongs(saved);
    }
    
    /**
     * Actualiza una playlist existente.
     */
    @Transactional
    public PlaylistDTO update(Long id, PlaylistCreateDTO dto) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Playlist", id));
        
        // Validar nombre único si cambió
        if (dto.getName() != null && !dto.getName().equalsIgnoreCase(playlist.getName())) {
            if (playlistRepository.existsByNameIgnoreCase(dto.getName())) {
                throw new BadRequestException("Ya existe una playlist con el nombre: " + dto.getName());
            }
        }
        
        mapper.updatePlaylistFromDTO(playlist, dto);
        Playlist saved = playlistRepository.save(playlist);
        
        log.info("Playlist actualizada: {} ({})", saved.getName(), saved.getId());
        return toPlaylistDTOWithSongs(saved);
    }
    
    /**
     * Elimina una playlist.
     */
    @Transactional
    public void delete(Long id) {
        if (!playlistRepository.existsById(id)) {
            throw new ResourceNotFoundException("Playlist", id);
        }
        
        // Eliminar relaciones primero
        playlistSongRepository.deleteByPlaylistId(id);
        playlistRepository.deleteById(id);
        
        log.info("Playlist eliminada: {}", id);
    }
    
    // ==================== GESTIÓN DE CANCIONES ====================
    
    /**
     * Agrega una canción a una playlist.
     */
    @Transactional
    public void addSong(Long playlistId, Long songId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Playlist", playlistId));
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", songId));
        
        // Verificar si ya existe
        if (playlistSongRepository.existsByPlaylistIdAndSongId(playlistId, songId)) {
            log.debug("La canción {} ya está en la playlist {}", songId, playlistId);
            return;
        }
        
        // Obtener el siguiente índice
        int nextIndex = playlistSongRepository.findMaxOrderIndexByPlaylistId(playlistId) + 1;
        
        PlaylistSong playlistSong = PlaylistSong.builder()
                .playlist(playlist)
                .song(song)
                .orderIndex(nextIndex)
                .addedAt(LocalDateTime.now())
                .build();
        
        playlistSongRepository.save(playlistSong);
        log.info("Canción {} agregada a playlist {}", song.getTitle(), playlist.getName());
    }
    
    /**
     * Agrega múltiples canciones a una playlist.
     */
    @Transactional
    public void addSongsToPlaylist(Long playlistId, List<Long> songIds) {
        for (Long songId : songIds) {
            try {
                addSong(playlistId, songId);
            } catch (ResourceNotFoundException e) {
                log.warn("Canción {} no encontrada, omitiendo", songId);
            }
        }
    }
    
    /**
     * Elimina una canción de una playlist.
     */
    @Transactional
    public void removeSong(Long playlistId, Long songId) {
        if (!playlistRepository.existsById(playlistId)) {
            throw new ResourceNotFoundException("Playlist", playlistId);
        }
        
        playlistSongRepository.deleteByPlaylistIdAndSongId(playlistId, songId);
        log.info("Canción {} eliminada de playlist {}", songId, playlistId);
    }
    
    /**
     * Reordena las canciones de una playlist.
     */
    @Transactional
    public void reorderSongs(Long playlistId, List<Long> songIds) {
        if (!playlistRepository.existsById(playlistId)) {
            throw new ResourceNotFoundException("Playlist", playlistId);
        }
        
        for (int i = 0; i < songIds.size(); i++) {
            Long songId = songIds.get(i);
            final int orderIndex = i;
            playlistSongRepository.findByPlaylistIdAndSongId(playlistId, songId)
                    .ifPresent(ps -> {
                        ps.setOrderIndex(orderIndex);
                        playlistSongRepository.save(ps);
                    });
        }
        
        log.info("Playlist {} reordenada", playlistId);
    }
    
    // ==================== HELPERS ====================
    
    private PlaylistDTO toPlaylistDTOWithSongs(Playlist playlist) {
        List<Long> songIds = playlistSongRepository.findSongIdsByPlaylistId(playlist.getId());
        return mapper.toPlaylistDTO(playlist, songIds);
    }
}
