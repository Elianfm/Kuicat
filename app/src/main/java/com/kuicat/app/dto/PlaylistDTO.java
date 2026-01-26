package com.kuicat.app.dto;

import com.kuicat.app.entity.Playlist.PlaylistType;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO para transferir datos de Playlist al frontend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistDTO {
    private Long id;
    private String name;
    private String icon;
    private PlaylistType type;
    private String filterCriteria;
    private List<Long> songIds;
    private Integer songCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
