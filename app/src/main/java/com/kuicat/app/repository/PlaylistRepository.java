package com.kuicat.app.repository;

import com.kuicat.app.entity.Playlist;
import com.kuicat.app.entity.Playlist.PlaylistType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {
    
    /**
     * Busca una playlist por nombre (case insensitive).
     */
    Optional<Playlist> findByNameIgnoreCase(String name);
    
    /**
     * Busca playlists por tipo.
     */
    List<Playlist> findByType(PlaylistType type);
    
    /**
     * Obtiene todas las playlists ordenadas por nombre.
     */
    List<Playlist> findAllByOrderByNameAsc();
    
    /**
     * Obtiene las playlists personalizadas (no dinámicas).
     */
    List<Playlist> findByTypeOrderByNameAsc(PlaylistType type);
    
    /**
     * Verifica si existe una playlist con el nombre dado.
     */
    boolean existsByNameIgnoreCase(String name);
}
