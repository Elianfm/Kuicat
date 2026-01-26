package com.kuicat.app.repository;

import com.kuicat.app.entity.Playlist;
import com.kuicat.app.entity.PlaylistSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaylistSongRepository extends JpaRepository<PlaylistSong, Long> {
    
    /**
     * Obtiene todas las canciones de una playlist ordenadas.
     */
    List<PlaylistSong> findByPlaylistIdOrderByOrderIndexAsc(Long playlistId);
    
    /**
     * Obtiene los IDs de las canciones en una playlist.
     */
    @Query("SELECT ps.song.id FROM PlaylistSong ps WHERE ps.playlist.id = :playlistId ORDER BY ps.orderIndex")
    List<Long> findSongIdsByPlaylistId(@Param("playlistId") Long playlistId);
    
    /**
     * Verifica si una canción está en una playlist.
     */
    boolean existsByPlaylistIdAndSongId(Long playlistId, Long songId);
    
    /**
     * Encuentra la relación entre una playlist y una canción.
     */
    Optional<PlaylistSong> findByPlaylistIdAndSongId(Long playlistId, Long songId);
    
    /**
     * Elimina una canción de una playlist.
     */
    @Modifying
    void deleteByPlaylistIdAndSongId(Long playlistId, Long songId);
    
    /**
     * Elimina todas las canciones de una playlist.
     */
    @Modifying
    void deleteByPlaylistId(Long playlistId);
    
    /**
     * Cuenta las canciones en una playlist.
     */
    long countByPlaylistId(Long playlistId);
    
    /**
     * Obtiene el máximo orderIndex en una playlist.
     */
    @Query("SELECT COALESCE(MAX(ps.orderIndex), 0) FROM PlaylistSong ps WHERE ps.playlist.id = :playlistId")
    Integer findMaxOrderIndexByPlaylistId(@Param("playlistId") Long playlistId);
    
    /**
     * Obtiene todas las playlists que contienen una canción.
     */
    @Query("SELECT ps.playlist FROM PlaylistSong ps WHERE ps.song.id = :songId")
    List<Playlist> findPlaylistsBySongId(@Param("songId") Long songId);
    
    /**
     * Elimina todas las referencias a una canción (cuando se elimina la canción).
     */
    @Modifying
    void deleteBySongId(Long songId);
}
