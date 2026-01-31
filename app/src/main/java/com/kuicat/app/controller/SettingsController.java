package com.kuicat.app.controller;

import com.kuicat.app.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST para gestión de configuraciones.
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SettingsController {
    
    private final SettingsService settingsService;
    
    /**
     * Obtiene todas las configuraciones (API keys enmascaradas).
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> getAllSettings() {
        return ResponseEntity.ok(settingsService.getAllSettingsForDisplay());
    }
    
    /**
     * Obtiene una configuración específica (enmascarada si es sensible).
     */
    @GetMapping("/{key}")
    public ResponseEntity<Map<String, String>> getSetting(@PathVariable String key) {
        return settingsService.getSettingForDisplay(key)
            .map(value -> ResponseEntity.ok(Map.of("key", key, "value", value)))
            .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Verifica si una API key está configurada.
     */
    @GetMapping("/{key}/exists")
    public ResponseEntity<Map<String, Boolean>> hasApiKey(@PathVariable String key) {
        boolean exists = settingsService.hasApiKey(key);
        return ResponseEntity.ok(Map.of("exists", exists));
    }
    
    /**
     * Guarda una configuración.
     */
    @PostMapping("/{key}")
    public ResponseEntity<Map<String, String>> saveSetting(
            @PathVariable String key,
            @RequestBody Map<String, String> body) {
        String value = body.get("value");
        if (value == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "El campo 'value' es requerido"));
        }
        
        settingsService.saveSetting(key, value);
        
        // Retornar la versión enmascarada
        String displayValue = settingsService.getSettingForDisplay(key).orElse("");
        return ResponseEntity.ok(Map.of("key", key, "value", displayValue));
    }
    
    /**
     * Elimina una configuración.
     */
    @DeleteMapping("/{key}")
    public ResponseEntity<Void> deleteSetting(@PathVariable String key) {
        settingsService.deleteSetting(key);
        return ResponseEntity.noContent().build();
    }
}
