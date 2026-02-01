package com.kuicat.app.controller;

import com.kuicat.app.dto.PlayerStateDTO;
import com.kuicat.app.service.PlayerStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para la persistencia del estado del reproductor.
 */
@RestController
@RequestMapping("/api/player/state")
@RequiredArgsConstructor
public class PlayerStateController {
    
    private final PlayerStateService playerStateService;
    
    /**
     * Obtiene el estado guardado del reproductor.
     */
    @GetMapping
    public ResponseEntity<PlayerStateDTO> getState() {
        return ResponseEntity.ok(playerStateService.getState());
    }
    
    /**
     * Guarda el estado del reproductor.
     */
    @PutMapping
    public ResponseEntity<PlayerStateDTO> saveState(@RequestBody PlayerStateDTO state) {
        return ResponseEntity.ok(playerStateService.saveState(state));
    }
    
    /**
     * Limpia el estado guardado (nueva sesión).
     */
    @DeleteMapping
    public ResponseEntity<Void> clearState() {
        playerStateService.clearState();
        return ResponseEntity.ok().build();
    }
}
