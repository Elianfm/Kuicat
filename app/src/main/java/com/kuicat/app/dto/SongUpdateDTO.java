package com.kuicat.app.dto;

import lombok.*;

/**
 * DTO para actualizar datos editables de una canción.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongUpdateDTO {
    private String title;
    private String artist;
    private String album;
    private Integer year;
    private String genre;
    private String description;
    private Integer rating;
    private String notes;
    private String lyrics;
}
