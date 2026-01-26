package com.kuicat.app.dto;

import com.kuicat.app.entity.Playlist.PlaylistType;
import lombok.*;
import java.util.List;

/**
 * DTO para crear o actualizar una playlist.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistCreateDTO {
    private String name;
    private String icon;
    private PlaylistType type;
    private String filterCriteria;
    private List<Long> songIds;
}
