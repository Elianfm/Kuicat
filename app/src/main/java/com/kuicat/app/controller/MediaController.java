package com.kuicat.app.controller;

import com.kuicat.app.entity.Song;
import com.kuicat.app.exception.ResourceNotFoundException;
import com.kuicat.app.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Controlador para streaming de archivos multimedia.
 * Soporta audio (MP3, FLAC, etc.) y video (MP4, WEBM).
 */
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MediaController {
    
    private final SongRepository songRepository;
    
    // Mapeo de extensiones a MIME types
    private static final Map<String, String> MIME_TYPES = Map.ofEntries(
        // Audio
        Map.entry("mp3", "audio/mpeg"),
        Map.entry("flac", "audio/flac"),
        Map.entry("ogg", "audio/ogg"),
        Map.entry("m4a", "audio/mp4"),
        Map.entry("wav", "audio/wav"),
        Map.entry("wma", "audio/x-ms-wma"),
        Map.entry("aac", "audio/aac"),
        Map.entry("opus", "audio/opus"),
        // Video
        Map.entry("mp4", "video/mp4"),
        Map.entry("webm", "video/webm"),
        Map.entry("mkv", "video/x-matroska")
    );
    
    /**
     * Stream de un archivo multimedia por ID de canción.
     * Soporta HTTP Range requests para seeking.
     * 
     * GET /api/media/{songId}/stream
     */
    @GetMapping("/{songId}/stream")
    public ResponseEntity<Resource> streamMedia(
            @PathVariable Long songId,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader
    ) {
        try {
            Song song = songRepository.findById(songId).orElse(null);
            if (song == null) {
                log.error("Canción no encontrada: {}", songId);
                return ResponseEntity.notFound().build();
            }
            
            Path filePath = Paths.get(song.getFilePath());
            if (!Files.exists(filePath)) {
                log.error("Archivo no encontrado: {}", filePath);
                return ResponseEntity.notFound().build();
            }
            
            File file = filePath.toFile();
            long fileLength = file.length();
            String extension = getExtension(file.getName()).toLowerCase();
            String mimeType = MIME_TYPES.getOrDefault(extension, "application/octet-stream");
            
            // Si hay Range header, hacer streaming parcial
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                return handleRangeRequest(file, fileLength, mimeType, rangeHeader);
            }
            
            // Sin Range: devolver archivo completo
            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(mimeType))
                    .contentLength(fileLength)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .body(resource);
        } catch (Exception e) {
            log.error("Error streaming media: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Obtiene información del tipo de media (audio/video).
     * 
     * GET /api/media/{songId}/info
     */
    @GetMapping("/{songId}/info")
    public ResponseEntity<MediaInfo> getMediaInfo(@PathVariable Long songId) {
        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", songId));
        
        String extension = getExtension(song.getFilePath()).toLowerCase();
        boolean isVideo = isVideoFormat(extension);
        String mimeType = MIME_TYPES.getOrDefault(extension, "application/octet-stream");
        
        return ResponseEntity.ok(new MediaInfo(
            songId,
            extension,
            mimeType,
            isVideo ? "video" : "audio",
            isVideo
        ));
    }
    
    /**
     * Maneja requests con Range header para seeking.
     */
    private ResponseEntity<Resource> handleRangeRequest(
            File file, 
            long fileLength, 
            String mimeType,
            String rangeHeader
    ) throws IOException {
        // Parsear "bytes=start-end"
        String range = rangeHeader.replace("bytes=", "");
        String[] parts = range.split("-");
        
        long start = Long.parseLong(parts[0]);
        long end = parts.length > 1 && !parts[1].isEmpty() 
                ? Long.parseLong(parts[1]) 
                : fileLength - 1;
        
        // Validar rangos
        if (start >= fileLength) {
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + fileLength)
                    .build();
        }
        
        end = Math.min(end, fileLength - 1);
        long contentLength = end - start + 1;
        
        // Crear resource que lee solo el rango solicitado
        Resource rangeResource = new RangeResource(file, start, contentLength);
        
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(MediaType.parseMediaType(mimeType))
                .contentLength(contentLength)
                .header(HttpHeaders.CONTENT_RANGE, String.format("bytes %d-%d/%d", start, end, fileLength))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(rangeResource);
    }
    
    private String getExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : "";
    }
    
    private boolean isVideoFormat(String extension) {
        return extension.equals("mp4") || extension.equals("webm") || extension.equals("mkv");
    }
    
    // DTO para info de media
    public record MediaInfo(
        Long songId,
        String format,
        String mimeType,
        String type, // "audio" o "video"
        boolean isVideo
    ) {}
    
    /**
     * Resource personalizado para leer solo un rango del archivo.
     */
    private static class RangeResource extends FileSystemResource {
        private final long start;
        private final long length;
        
        public RangeResource(File file, long start, long length) {
            super(file);
            this.start = start;
            this.length = length;
        }
        
        @Override
        public java.io.InputStream getInputStream() throws IOException {
            RandomAccessFile raf = new RandomAccessFile(getFile(), "r");
            raf.seek(start);
            return new java.io.InputStream() {
                private long remaining = length;
                
                @Override
                public int read() throws IOException {
                    if (remaining <= 0) {
                        raf.close();
                        return -1;
                    }
                    remaining--;
                    return raf.read();
                }
                
                @Override
                public int read(byte[] b, int off, int len) throws IOException {
                    if (remaining <= 0) {
                        raf.close();
                        return -1;
                    }
                    int toRead = (int) Math.min(len, remaining);
                    int read = raf.read(b, off, toRead);
                    if (read > 0) {
                        remaining -= read;
                    }
                    if (remaining <= 0) {
                        raf.close();
                    }
                    return read;
                }
                
                @Override
                public void close() throws IOException {
                    raf.close();
                }
            };
        }
        
        @Override
        public long contentLength() {
            return length;
        }
    }
}
