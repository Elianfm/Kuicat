package com.kuicat.app.mapper;

import com.kuicat.app.dto.*;
import com.kuicat.app.entity.*;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapper para convertir entre entidades y DTOs.
 */
@Component
public class EntityMapper {
    
    // ==================== SONG ====================
    
    public SongDTO toSongDTO(Song song) {
        if (song == null) return null;
        
        return SongDTO.builder()
                .id(song.getId())
                .filePath(song.getFilePath())
                .title(song.getTitle())
                .artist(song.getArtist())
                .album(song.getAlbum())
                .year(song.getYear())
                .genre(song.getGenre())
                .duration(song.getDuration())
                .description(song.getDescription())
                .rating(song.getRating())
                .ranking(song.getRanking())
                .rankPosition(null) // Se calcula en el servicio
                .playCount(song.getPlayCount())
                .lastPlayed(song.getLastPlayed())
                .notes(song.getNotes())
                .lyrics(song.getLyrics())
                .createdAt(song.getCreatedAt())
                .updatedAt(song.getUpdatedAt())
                .build();
    }
    
    public List<SongDTO> toSongDTOs(List<Song> songs) {
        return songs.stream()
                .map(this::toSongDTO)
                .toList();
    }
    
    public void updateSongFromDTO(Song song, SongUpdateDTO dto) {
        if (dto.getTitle() != null) song.setTitle(dto.getTitle());
        if (dto.getArtist() != null) song.setArtist(dto.getArtist());
        if (dto.getAlbum() != null) song.setAlbum(dto.getAlbum());
        if (dto.getYear() != null) song.setYear(dto.getYear());
        if (dto.getGenre() != null) song.setGenre(dto.getGenre());
        if (dto.getDescription() != null) song.setDescription(dto.getDescription());
        if (dto.getRating() != null) song.setRating(dto.getRating());
        if (dto.getNotes() != null) song.setNotes(dto.getNotes());
        if (dto.getLyrics() != null) song.setLyrics(dto.getLyrics());
    }
    
    // ==================== PLAYLIST ====================
    
    public PlaylistDTO toPlaylistDTO(Playlist playlist, List<Long> songIds) {
        if (playlist == null) return null;
        
        return PlaylistDTO.builder()
                .id(playlist.getId())
                .name(playlist.getName())
                .icon(playlist.getIcon())
                .type(playlist.getType())
                .filterCriteria(playlist.getFilterCriteria())
                .songIds(songIds)
                .songCount(songIds != null ? songIds.size() : 0)
                .createdAt(playlist.getCreatedAt())
                .updatedAt(playlist.getUpdatedAt())
                .build();
    }
    
    public Playlist toPlaylistEntity(PlaylistCreateDTO dto) {
        return Playlist.builder()
                .name(dto.getName())
                .icon(dto.getIcon())
                .type(dto.getType() != null ? dto.getType() : Playlist.PlaylistType.CUSTOM)
                .filterCriteria(dto.getFilterCriteria())
                .build();
    }
    
    public void updatePlaylistFromDTO(Playlist playlist, PlaylistCreateDTO dto) {
        if (dto.getName() != null) playlist.setName(dto.getName());
        if (dto.getIcon() != null) playlist.setIcon(dto.getIcon());
        if (dto.getType() != null) playlist.setType(dto.getType());
        if (dto.getFilterCriteria() != null) playlist.setFilterCriteria(dto.getFilterCriteria());
    }
}
