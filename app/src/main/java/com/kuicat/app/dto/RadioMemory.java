package com.kuicat.app.dto;

import lombok.*;
import java.util.*;
import java.time.LocalDateTime;

/**
 * Memoria de sesión de radio.
 * Almacena el contexto para mantener coherencia entre anuncios.
 * Se mantiene en memoria (no persistida) y se resetea al iniciar nueva sesión.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RadioMemory {
    
    /**
     * Límite de caracteres para el historial de scripts (~1000 tokens).
     */
    public static final int MAX_SCRIPT_CHARS = 4000;
    
    /**
     * Máximo de canciones a recordar en cada dirección.
     */
    public static final int MAX_SONG_HISTORY = 10;
    
    /**
     * Identidad de la radio generada al inicio de sesión.
     * Incluye: nombre creativo, vibe, narrativa, estilo del DJ.
     */
    @Builder.Default
    private RadioIdentity identity = null;
    
    /**
     * Historial de scripts generados (completos).
     * Cola FIFO - cuando supera MAX_SCRIPT_CHARS, elimina los más antiguos.
     */
    @Builder.Default
    private LinkedList<String> scriptHistory = new LinkedList<>();
    
    /**
     * Canciones reproducidas anteriormente (solo "Título - Artista").
     */
    @Builder.Default
    private LinkedList<String> previousSongs = new LinkedList<>();
    
    /**
     * Momento en que se inició la sesión.
     */
    private LocalDateTime sessionStart;
    
    /**
     * Contador de anuncios generados en esta sesión.
     */
    @Builder.Default
    private int announcementCount = 0;
    
    /**
     * Añade un script al historial, manteniendo el límite de caracteres.
     */
    public void addScript(String script) {
        if (script == null || script.isBlank()) return;
        
        scriptHistory.addLast(script);
        announcementCount++;
        
        // Trim si excede el límite
        trimScriptHistory();
    }
    
    /**
     * Elimina scripts antiguos hasta que el total esté bajo el límite.
     */
    private void trimScriptHistory() {
        while (getTotalScriptChars() > MAX_SCRIPT_CHARS && !scriptHistory.isEmpty()) {
            scriptHistory.removeFirst();
        }
    }
    
    /**
     * Calcula el total de caracteres en el historial de scripts.
     */
    public int getTotalScriptChars() {
        return scriptHistory.stream()
            .mapToInt(String::length)
            .sum();
    }
    
    /**
     * Obtiene el historial de scripts como texto formateado.
     */
    public String getFormattedScriptHistory() {
        if (scriptHistory.isEmpty()) {
            return "(This is your first announcement of the session)";
        }
        
        StringBuilder sb = new StringBuilder();
        int index = 1;
        for (String script : scriptHistory) {
            sb.append("[Announcement ").append(index++).append("]: ");
            sb.append(script).append("\n\n");
        }
        return sb.toString().trim();
    }
    
    /**
     * Añade una canción al historial de reproducidas.
     */
    public void addPreviousSong(String songInfo) {
        if (songInfo == null || songInfo.isBlank()) return;
        
        previousSongs.addLast(songInfo);
        
        // Mantener solo las últimas MAX_SONG_HISTORY
        while (previousSongs.size() > MAX_SONG_HISTORY) {
            previousSongs.removeFirst();
        }
    }
    
    /**
     * Obtiene el historial de canciones como lista simple.
     */
    public List<String> getPreviousSongsList() {
        return new ArrayList<>(previousSongs);
    }
    
    /**
     * Verifica si es el primer anuncio de la sesión.
     */
    public boolean isFirstAnnouncement() {
        return announcementCount == 0;
    }
    
    /**
     * Resetea la memoria para una nueva sesión.
     */
    public void reset() {
        identity = null;
        scriptHistory.clear();
        previousSongs.clear();
        sessionStart = LocalDateTime.now();
        announcementCount = 0;
    }
    
    /**
     * Identidad de la radio para esta sesión.
     * Generada por el LLM al inicio basándose en las instrucciones del usuario
     * y las primeras canciones en cola.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RadioIdentity {
        /** Nombre creativo de la sesión (ej: "Noche de Clásicos") */
        private String sessionName;
        
        /** Vibe de la sesión en 2-3 palabras (ej: "nostálgico y relajante") */
        private String sessionVibe;
        
        /** Narrativa/tema de la noche (ej: "Un viaje por los 80s") */
        private String openingNarrative;
        
        /** Estilo de locución para esta sesión */
        private String djStyle;
    }
}
