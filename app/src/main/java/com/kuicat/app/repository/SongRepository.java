package com.kuicat.app.repository;

import com.kuicat.app.entity.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SongRepository extends JpaRepository<Song, Long>, JpaSpecificationExecutor<Song> {
    
    /**
     * Busca una canción por su ruta de archivo.
     */
    Optional<Song> findByFilePath(String filePath);
    
    /**
     * Busca una canción por su hash de archivo.
     * Útil para detectar archivos movidos.
     */
    Optional<Song> findByFileHash(String fileHash);
    
    /**
     * Verifica si existe una canción con la ruta dada.
     */
    boolean existsByFilePath(String filePath);
    
    /**
     * Busca canciones por artista.
     */
    List<Song> findByArtistIgnoreCase(String artist);
    
    /**
     * Busca canciones por álbum.
     */
    List<Song> findByAlbumIgnoreCase(String album);
    
    /**
     * Busca canciones por género.
     */
    List<Song> findByGenreIgnoreCase(String genre);
    
    /**
     * Busca canciones con rating mayor o igual al especificado.
     */
    List<Song> findByRatingGreaterThanEqual(Integer rating);
    
    /**
     * Obtiene todos los artistas únicos.
     */
    @Query("SELECT DISTINCT s.artist FROM Song s WHERE s.artist IS NOT NULL ORDER BY s.artist")
    List<String> findAllArtists();
    
    /**
     * Obtiene todos los álbumes únicos.
     */
    @Query("SELECT DISTINCT s.album FROM Song s WHERE s.album IS NOT NULL ORDER BY s.album")
    List<String> findAllAlbums();
    
    /**
     * Obtiene todos los géneros únicos.
     */
    @Query("SELECT DISTINCT s.genre FROM Song s WHERE s.genre IS NOT NULL ORDER BY s.genre")
    List<String> findAllGenres();
    
    /**
     * Busca canciones cuyo título, artista o álbum contengan el texto dado.
     */
    @Query("SELECT s FROM Song s WHERE " +
           "LOWER(s.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.artist) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.album) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Song> searchByQuery(@Param("query") String query);
    
    /**
     * Obtiene las canciones más reproducidas.
     */
    List<Song> findTop20ByOrderByPlayCountDesc();
    
    /**
     * Obtiene las canciones reproducidas recientemente.
     */
    List<Song> findTop20ByLastPlayedIsNotNullOrderByLastPlayedDesc();
    
    /**
     * Cuenta canciones por género.
     */
    long countByGenreIgnoreCase(String genre);
    
    /**
     * Cuenta canciones por artista.
     */
    long countByArtistIgnoreCase(String artist);
    
    // ==================== RANKING ====================
    
    /**
     * Obtiene canciones con ranking ordenadas por ranking ascendente.
     */
    List<Song> findByRankingNotNullOrderByRankingAsc();
    
    /**
     * Obtiene todas las canciones ordenadas: primero las rankeadas, luego las sin rankear.
     */
    @Query("SELECT s FROM Song s ORDER BY CASE WHEN s.ranking IS NULL THEN 1 ELSE 0 END, s.ranking ASC")
    List<Song> findAllOrderByRankingNullsLast();
}
