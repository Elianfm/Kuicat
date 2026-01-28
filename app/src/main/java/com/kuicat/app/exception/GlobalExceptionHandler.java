package com.kuicat.app.exception;

import lombok.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

/**
 * Manejador global de excepciones para respuestas consistentes.
 * Solo aplica a controladores que NO son de streaming multimedia.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ErrorResponse.of(HttpStatus.NOT_FOUND, ex.getMessage()));
    }
    
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception ex) {
        // Si la excepción viene de streaming de media, devolver sin body JSON
        // (el Content-Type puede ser video/audio que no acepta JSON)
        String stackTrace = getStackTraceAsString(ex);
        if (stackTrace.contains("MediaController") || stackTrace.contains("StreamingResponseBody")) {
            return ResponseEntity.internalServerError().build();
        }
        
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR, 
                        "Error interno del servidor: " + ex.getMessage()));
    }
    
    private String getStackTraceAsString(Exception ex) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : ex.getStackTrace()) {
            sb.append(element.getClassName()).append("\n");
        }
        return sb.toString();
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ErrorResponse {
        private LocalDateTime timestamp;
        private int status;
        private String error;
        private String message;
        
        public static ErrorResponse of(HttpStatus status, String message) {
            return ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .build();
        }
    }
}
