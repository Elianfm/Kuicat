package com.kuicat.app.service;

import com.kuicat.app.entity.Song;
import com.kuicat.app.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.audio.AudioHeader;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/**
 * Servicio para escanear carpetas de música y extraer metadatos.
 * Usa JAudioTagger para leer ID3 tags, Vorbis comments, etc.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MusicScannerService {
    
    private final SongRepository songRepository;
    
    // Extensiones de audio soportadas
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(
        "mp3", "flac", "ogg", "m4a", "wav", "wma", "aac", "opus"
    );
    
    /**
     * Resultado del escaneo.
     */
    public record ScanResult(
        int totalFiles,
        int newSongs,
        int updatedSongs,
        int skippedSongs,
        int errors,
        List<String> errorMessages
    ) {}
    
    /**
     * Escanea una carpeta recursivamente y añade/actualiza canciones.
     * 
     * @param folderPath Ruta de la carpeta a escanear
     * @return Resultado del escaneo con estadísticas
     */
    @Transactional
    public ScanResult scanFolder(String folderPath) {
        log.info("Iniciando escaneo de: {}", folderPath);
        
        Path folder = Paths.get(folderPath);
        if (!Files.exists(folder) || !Files.isDirectory(folder)) {
            return new ScanResult(0, 0, 0, 0, 1, 
                List.of("La carpeta no existe o no es válida: " + folderPath));
        }
        
        AtomicInteger totalFiles = new AtomicInteger(0);
        AtomicInteger newSongs = new AtomicInteger(0);
        AtomicInteger updatedSongs = new AtomicInteger(0);
        AtomicInteger skippedSongs = new AtomicInteger(0);
        AtomicInteger errors = new AtomicInteger(0);
        List<String> errorMessages = Collections.synchronizedList(new ArrayList<>());
        
        try (Stream<Path> paths = Files.walk(folder)) {
            paths.filter(Files::isRegularFile)
                 .filter(this::isAudioFile)
                 .forEach(path -> {
                     totalFiles.incrementAndGet();
                     try {
                         ProcessResult result = processAudioFile(path);
                         switch (result) {
                             case NEW -> newSongs.incrementAndGet();
                             case UPDATED -> updatedSongs.incrementAndGet();
                             case SKIPPED -> skippedSongs.incrementAndGet();
                         }
                     } catch (Exception e) {
                         errors.incrementAndGet();
                         String errorMsg = path.getFileName() + ": " + e.getMessage();
                         errorMessages.add(errorMsg);
                         log.warn("Error procesando {}: {}", path, e.getMessage());
                     }
                 });
        } catch (IOException e) {
            log.error("Error al recorrer la carpeta: {}", e.getMessage());
            errorMessages.add("Error al recorrer la carpeta: " + e.getMessage());
            errors.incrementAndGet();
        }
        
        log.info("Escaneo completado: {} archivos, {} nuevos, {} actualizados, {} omitidos, {} errores",
            totalFiles.get(), newSongs.get(), updatedSongs.get(), skippedSongs.get(), errors.get());
        
        return new ScanResult(
            totalFiles.get(),
            newSongs.get(),
            updatedSongs.get(),
            skippedSongs.get(),
            errors.get(),
            errorMessages
        );
    }
    
    private enum ProcessResult { NEW, UPDATED, SKIPPED }
    
    /**
     * Procesa un archivo de audio individual.
     */
    private ProcessResult processAudioFile(Path path) throws Exception {
        String filePath = path.toAbsolutePath().toString();
        String fileHash = calculateFileHash(path);
        
        // Verificar si ya existe por ruta
        Optional<Song> existingByPath = songRepository.findByFilePath(filePath);
        if (existingByPath.isPresent()) {
            Song existing = existingByPath.get();
            // Si el hash es igual, no hay cambios
            if (existing.getFileHash().equals(fileHash)) {
                return ProcessResult.SKIPPED;
            }
            // Si el hash cambió, actualizar metadatos
            updateSongFromFile(existing, path, fileHash);
            songRepository.save(existing);
            return ProcessResult.UPDATED;
        }
        
        // Verificar si existe por hash (archivo movido)
        Optional<Song> existingByHash = songRepository.findByFileHash(fileHash);
        if (existingByHash.isPresent()) {
            Song existing = existingByHash.get();
            existing.setFilePath(filePath); // Actualizar ruta
            songRepository.save(existing);
            log.info("Archivo movido detectado: {}", path.getFileName());
            return ProcessResult.UPDATED;
        }
        
        // Crear nueva canción
        Song newSong = createSongFromFile(path, fileHash);
        songRepository.save(newSong);
        log.debug("Nueva canción: {} - {}", newSong.getArtist(), newSong.getTitle());
        return ProcessResult.NEW;
    }
    
    /**
     * Crea una nueva entidad Song a partir de un archivo de audio.
     */
    private Song createSongFromFile(Path path, String fileHash) throws Exception {
        AudioFile audioFile = AudioFileIO.read(path.toFile());
        AudioHeader header = audioFile.getAudioHeader();
        Tag tag = audioFile.getTag();
        
        String fileName = path.getFileName().toString();
        String extension = getExtension(fileName).toLowerCase();
        
        return Song.builder()
            .filePath(path.toAbsolutePath().toString())
            .fileHash(fileHash)
            .format(extension)
            .bitrate(header.getBitRateAsNumber() > 0 ? (int) header.getBitRateAsNumber() : null)
            .sampleRate(header.getSampleRateAsNumber())
            .duration(header.getTrackLength())
            .title(getTagOrDefault(tag, FieldKey.TITLE, getFileNameWithoutExtension(fileName)))
            .artist(getTag(tag, FieldKey.ARTIST))
            .albumArtist(getTag(tag, FieldKey.ALBUM_ARTIST))
            .album(getTag(tag, FieldKey.ALBUM))
            .year(parseYear(getTag(tag, FieldKey.YEAR)))
            .trackNumber(parseInteger(getTag(tag, FieldKey.TRACK)))
            .discNumber(parseInteger(getTag(tag, FieldKey.DISC_NO)))
            .genre(getTag(tag, FieldKey.GENRE))
            .composer(getTag(tag, FieldKey.COMPOSER))
            .lyrics(getTag(tag, FieldKey.LYRICS))
            .rating(0)
            .playCount(0)
            .build();
    }
    
    /**
     * Actualiza una canción existente con los metadatos del archivo.
     */
    private void updateSongFromFile(Song song, Path path, String fileHash) throws Exception {
        AudioFile audioFile = AudioFileIO.read(path.toFile());
        AudioHeader header = audioFile.getAudioHeader();
        Tag tag = audioFile.getTag();
        
        String fileName = path.getFileName().toString();
        String extension = getExtension(fileName).toLowerCase();
        
        song.setFileHash(fileHash);
        song.setFormat(extension);
        song.setBitrate(header.getBitRateAsNumber() > 0 ? (int) header.getBitRateAsNumber() : null);
        song.setSampleRate(header.getSampleRateAsNumber());
        song.setDuration(header.getTrackLength());
        song.setTitle(getTagOrDefault(tag, FieldKey.TITLE, getFileNameWithoutExtension(fileName)));
        song.setArtist(getTag(tag, FieldKey.ARTIST));
        song.setAlbumArtist(getTag(tag, FieldKey.ALBUM_ARTIST));
        song.setAlbum(getTag(tag, FieldKey.ALBUM));
        song.setYear(parseYear(getTag(tag, FieldKey.YEAR)));
        song.setTrackNumber(parseInteger(getTag(tag, FieldKey.TRACK)));
        song.setDiscNumber(parseInteger(getTag(tag, FieldKey.DISC_NO)));
        song.setGenre(getTag(tag, FieldKey.GENRE));
        song.setComposer(getTag(tag, FieldKey.COMPOSER));
        
        // Solo actualizar lyrics si no hay lyrics personalizadas
        String fileLyrics = getTag(tag, FieldKey.LYRICS);
        if (fileLyrics != null && (song.getLyrics() == null || song.getLyrics().isEmpty())) {
            song.setLyrics(fileLyrics);
        }
    }
    
    /**
     * Verifica si un archivo es de audio soportado.
     */
    private boolean isAudioFile(Path path) {
        String fileName = path.getFileName().toString();
        String extension = getExtension(fileName).toLowerCase();
        return SUPPORTED_EXTENSIONS.contains(extension);
    }
    
    /**
     * Obtiene la extensión de un archivo.
     */
    private String getExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : "";
    }
    
    /**
     * Obtiene el nombre del archivo sin extensión.
     */
    private String getFileNameWithoutExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    }
    
    /**
     * Obtiene un tag del archivo, retorna null si no existe.
     */
    private String getTag(Tag tag, FieldKey key) {
        if (tag == null) return null;
        try {
            String value = tag.getFirst(key);
            return (value != null && !value.isBlank()) ? value.trim() : null;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Obtiene un tag o valor por defecto si no existe.
     */
    private String getTagOrDefault(Tag tag, FieldKey key, String defaultValue) {
        String value = getTag(tag, key);
        return value != null ? value : defaultValue;
    }
    
    /**
     * Parsea un año desde string (puede ser "2024" o "2024-05-15").
     */
    private Integer parseYear(String yearStr) {
        if (yearStr == null || yearStr.isBlank()) return null;
        try {
            // Tomar solo los primeros 4 caracteres si es una fecha completa
            String year = yearStr.length() >= 4 ? yearStr.substring(0, 4) : yearStr;
            return Integer.parseInt(year.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    /**
     * Parsea un entero desde string (para track number, disc number).
     */
    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            // Manejar formatos como "1/12" (track 1 de 12)
            String number = value.split("/")[0].trim();
            return Integer.parseInt(number);
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    /**
     * Calcula el hash MD5 del archivo para detectar cambios/duplicados.
     */
    private String calculateFileHash(Path path) throws IOException, NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        try (InputStream is = Files.newInputStream(path)) {
            byte[] buffer = new byte[8192];
            int read;
            // Solo hashear los primeros 1MB para mejor rendimiento
            int maxBytes = 1024 * 1024;
            int totalRead = 0;
            while ((read = is.read(buffer)) != -1 && totalRead < maxBytes) {
                md.update(buffer, 0, read);
                totalRead += read;
            }
        }
        byte[] digest = md.digest();
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
    
    /**
     * Elimina canciones de la base de datos cuyos archivos ya no existen.
     * 
     * @return Número de canciones eliminadas
     */
    @Transactional
    public int cleanupMissingSongs() {
        List<Song> allSongs = songRepository.findAll();
        List<Song> toDelete = allSongs.stream()
            .filter(song -> !Files.exists(Path.of(song.getFilePath())))
            .toList();
        
        if (!toDelete.isEmpty()) {
            songRepository.deleteAll(toDelete);
            log.info("Eliminadas {} canciones con archivos faltantes", toDelete.size());
        }
        
        return toDelete.size();
    }
}
