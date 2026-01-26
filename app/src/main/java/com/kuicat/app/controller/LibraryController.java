package com.kuicat.app.controller;

import com.kuicat.app.service.MusicScannerService;
import com.kuicat.app.service.MusicScannerService.ScanResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador para el escaneo de biblioteca musical.
 * Base path: /api/library
 */
@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LibraryController {
    
    private final MusicScannerService musicScannerService;
    
    /**
     * Escanea una carpeta de música.
     * 
     * POST /api/library/scan
     * Body: { "folderPath": "C:/Users/Music" }
     */
    @PostMapping("/scan")
    public ResponseEntity<ScanResult> scanFolder(@RequestBody Map<String, String> request) {
        String folderPath = request.get("folderPath");
        if (folderPath == null || folderPath.isBlank()) {
            return ResponseEntity.badRequest().body(
                new ScanResult(0, 0, 0, 0, 1, 
                    java.util.List.of("folderPath es requerido"))
            );
        }
        
        ScanResult result = musicScannerService.scanFolder(folderPath);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Limpia canciones huérfanas (archivos que ya no existen).
     * 
     * POST /api/library/cleanup
     */
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanup() {
        int removed = musicScannerService.cleanupMissingSongs();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "removedCount", removed,
            "message", removed + " canciones eliminadas"
        ));
    }
}
