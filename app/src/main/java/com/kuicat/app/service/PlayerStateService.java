package com.kuicat.app.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuicat.app.dto.PlayerStateDTO;
import com.kuicat.app.entity.PlayerState;
import com.kuicat.app.repository.PlayerStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Servicio para gestionar la persistencia del estado del reproductor.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerStateService {
    
    private final PlayerStateRepository repository;
    private final ObjectMapper objectMapper;
    
    /**
     * Obtiene el estado guardado del reproductor.
     */
    @Transactional(readOnly = true)
    public PlayerStateDTO getState() {
        PlayerState state = repository.findById(1L)
            .orElse(PlayerState.builder().id(1L).build());
        return toDTO(state);
    }
    
    /**
     * Guarda el estado del reproductor.
     */
    @Transactional
    public PlayerStateDTO saveState(PlayerStateDTO dto) {
        PlayerState state = repository.findById(1L)
            .orElse(PlayerState.builder().id(1L).build());
        
        // Actualizar campos
        state.setCurrentSongId(dto.getCurrentSongId());
        state.setQueuePosition(dto.getQueuePosition());
        state.setVolume(dto.getVolume());
        state.setIsPlaying(dto.getIsPlaying());
        state.setQueueIndex(dto.getQueueIndex());
        state.setPlaylistId(dto.getPlaylistId());
        state.setShuffleMode(dto.getShuffleMode());
        state.setRepeatMode(dto.getRepeatMode());
        state.setRankingFilter(dto.getRankingFilter());
        
        // Serializar lista de IDs a JSON
        if (dto.getQueueSongIds() != null) {
            try {
                state.setQueueSongIds(objectMapper.writeValueAsString(dto.getQueueSongIds()));
            } catch (JsonProcessingException e) {
                log.error("Error serializando queueSongIds", e);
                state.setQueueSongIds("[]");
            }
        } else {
            state.setQueueSongIds(null);
        }
        
        state = repository.save(state);
        log.debug("Estado del reproductor guardado: songId={}, position={}", 
            state.getCurrentSongId(), state.getQueuePosition());
        
        return toDTO(state);
    }
    
    /**
     * Limpia el estado guardado (nueva sesión).
     */
    @Transactional
    public void clearState() {
        repository.findById(1L).ifPresent(state -> {
            state.setCurrentSongId(null);
            state.setQueuePosition(0.0);
            state.setIsPlaying(false);
            state.setQueueSongIds(null);
            state.setQueueIndex(0);
            state.setPlaylistId(null);
            state.setShuffleMode(false);
            state.setRepeatMode("none");
            state.setRankingFilter(null);
            repository.save(state);
        });
    }
    
    private PlayerStateDTO toDTO(PlayerState state) {
        List<Long> queueIds = new ArrayList<>();
        
        if (state.getQueueSongIds() != null && !state.getQueueSongIds().isBlank()) {
            try {
                queueIds = objectMapper.readValue(
                    state.getQueueSongIds(), 
                    new TypeReference<List<Long>>() {}
                );
            } catch (JsonProcessingException e) {
                log.error("Error deserializando queueSongIds", e);
            }
        }
        
        return PlayerStateDTO.builder()
            .currentSongId(state.getCurrentSongId())
            .queuePosition(state.getQueuePosition())
            .volume(state.getVolume())
            .isPlaying(state.getIsPlaying())
            .queueSongIds(queueIds)
            .queueIndex(state.getQueueIndex())
            .playlistId(state.getPlaylistId())
            .shuffleMode(state.getShuffleMode())
            .repeatMode(state.getRepeatMode())
            .rankingFilter(state.getRankingFilter())
            .build();
    }
}
