package com.kuicat.app.service;

import com.kuicat.app.dto.*;
import com.kuicat.app.entity.Song;
import com.kuicat.app.exception.ResourceNotFoundException;
import com.kuicat.app.mapper.EntityMapper;
import com.kuicat.app.repository.SongRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Servicio para gestión de canciones.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SongService {
    
    private final SongRepository songRepository;
    private final EntityMapper mapper;
    private final RankingService rankingService;
    
    // ==================== CONSULTAS ====================
    
    /**
     * Obtiene una canción por ID.
     */
    public SongDTO findById(Long id) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", id));
        SongDTO dto = mapper.toSongDTO(song);
        
        // Calcular posición en ranking si tiene ranking
        if (song.getRanking() != null) {
            dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
        }
        
        return dto;
    }
    
    /**
     * Obtiene todas las canciones con paginación, filtros y ordenamiento.
     */
    public PageResponse<SongDTO> findAll(SongFilterCriteria filter, int page, int size, String sortBy, String sortDir) {
        // Validar y configurar ordenamiento
        Sort sort = createSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Construir especificación de filtros
        Specification<Song> spec = buildSpecification(filter);
        
        // Ejecutar consulta
        Page<Song> songPage = songRepository.findAll(spec, pageable);
        
        // Mapear a DTOs y calcular rankPosition para canciones que tienen ranking
        Page<SongDTO> dtoPage = songPage.map(song -> {
            SongDTO dto = mapper.toSongDTO(song);
            if (song.getRanking() != null) {
                dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
            }
            return dto;
        });
        return PageResponse.of(dtoPage);
    }
    
    /**
     * Búsqueda rápida por texto en título, artista, álbum.
     */
    public List<SongDTO> search(String query) {
        if (!StringUtils.hasText(query)) {
            return List.of();
        }
        List<Song> songs = songRepository.searchByQuery(query.trim());
        return mapper.toSongDTOs(songs);
    }
    
    /**
     * Obtiene todos los artistas únicos.
     */
    public List<String> getAllArtists() {
        return songRepository.findAllArtists();
    }
    
    /**
     * Obtiene todos los álbumes únicos.
     */
    public List<String> getAllAlbums() {
        return songRepository.findAllAlbums();
    }
    
    /**
     * Obtiene todos los géneros únicos.
     */
    public List<String> getAllGenres() {
        return songRepository.findAllGenres();
    }
    
    /**
     * Obtiene todos los artistas con el conteo de canciones.
     * Ordenados por número de canciones (descendente).
     */
    public List<CategoryCountDTO> getArtistsWithCount() {
        List<String> artists = songRepository.findAllArtists();
        return artists.stream()
                .map(artist -> CategoryCountDTO.builder()
                        .name(artist)
                        .count(songRepository.countByArtistIgnoreCase(artist))
                        .build())
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .toList();
    }
    
    /**
     * Obtiene todos los géneros con el conteo de canciones.
     * Ordenados por número de canciones (descendente).
     */
    public List<CategoryCountDTO> getGenresWithCount() {
        List<String> genres = songRepository.findAllGenres();
        return genres.stream()
                .map(genre -> CategoryCountDTO.builder()
                        .name(genre)
                        .count(songRepository.countByGenreIgnoreCase(genre))
                        .build())
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .toList();
    }
    
    /**
     * Obtiene canciones de un artista específico.
     */
    public List<SongDTO> getSongsByArtist(String artist) {
        List<Song> songs = songRepository.findByArtistIgnoreCase(artist);
        return songs.stream()
                .map(song -> {
                    SongDTO dto = mapper.toSongDTO(song);
                    if (song.getRanking() != null) {
                        dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
                    }
                    return dto;
                })
                .toList();
    }
    
    /**
     * Obtiene canciones de un género específico.
     */
    public List<SongDTO> getSongsByGenre(String genre) {
        List<Song> songs = songRepository.findByGenreIgnoreCase(genre);
        return songs.stream()
                .map(song -> {
                    SongDTO dto = mapper.toSongDTO(song);
                    if (song.getRanking() != null) {
                        dto.setRankPosition(rankingService.calculatePosition(song.getRanking()));
                    }
                    return dto;
                })
                .toList();
    }
    
    /**
     * Obtiene las canciones más reproducidas.
     */
    public List<SongDTO> getMostPlayed() {
        return mapper.toSongDTOs(songRepository.findTop20ByOrderByPlayCountDesc());
    }
    
    /**
     * Obtiene las canciones reproducidas recientemente.
     */
    public List<SongDTO> getRecentlyPlayed() {
        return mapper.toSongDTOs(songRepository.findTop20ByLastPlayedIsNotNullOrderByLastPlayedDesc());
    }
    
    // ==================== MODIFICACIONES ====================
    
    /**
     * Actualiza los datos editables de una canción.
     */
    @Transactional
    public SongDTO update(Long id, SongUpdateDTO updateDTO) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", id));
        
        mapper.updateSongFromDTO(song, updateDTO);
        Song saved = songRepository.save(song);
        
        log.info("Canción actualizada: {} - {}", saved.getId(), saved.getTitle());
        return mapper.toSongDTO(saved);
    }
    
    /**
     * Registra una reproducción de la canción.
     */
    @Transactional
    public SongDTO recordPlay(Long id) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", id));
        
        song.setPlayCount(song.getPlayCount() + 1);
        song.setLastPlayed(LocalDateTime.now());
        
        Song saved = songRepository.save(song);
        log.debug("Reproducción registrada: {} (total: {})", saved.getTitle(), saved.getPlayCount());
        
        return mapper.toSongDTO(saved);
    }
    
    /**
     * Actualiza las letras de una canción.
     */
    @Transactional
    public SongDTO updateLyrics(Long id, String lyrics) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", id));
        
        song.setLyrics(lyrics);
        Song saved = songRepository.save(song);
        
        log.info("Letras actualizadas: {}", saved.getTitle());
        return mapper.toSongDTO(saved);
    }
    
    /**
     * Actualiza las notas de una canción.
     */
    @Transactional
    public SongDTO updateNotes(Long id, String notes) {
        Song song = songRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canción", id));
        
        song.setNotes(notes);
        Song saved = songRepository.save(song);
        
        log.info("Notas actualizadas: {}", saved.getTitle());
        return mapper.toSongDTO(saved);
    }
    
    // ==================== HELPERS ====================
    
    /**
     * Crea el objeto Sort para ordenamiento.
     */
    private Sort createSort(String sortBy, String sortDir) {
        // Campos válidos para ordenar
        List<String> validFields = List.of(
            "id", "title", "artist", "album", "genre", "duration", 
            "rating", "playCount", "lastPlayed", "createdAt"
        );
        
        String field = validFields.contains(sortBy) ? sortBy : "title";
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        
        return Sort.by(direction, field);
    }
    
    /**
     * Construye la especificación JPA para los filtros.
     */
    private Specification<Song> buildSpecification(SongFilterCriteria filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (filter == null) {
                return cb.conjunction();
            }
            
            // Búsqueda por texto
            if (StringUtils.hasText(filter.getQuery())) {
                String pattern = "%" + filter.getQuery().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate artistMatch = cb.like(cb.lower(root.get("artist")), pattern);
                Predicate albumMatch = cb.like(cb.lower(root.get("album")), pattern);
                predicates.add(cb.or(titleMatch, artistMatch, albumMatch));
            }
            
            // Filtro por artista
            if (StringUtils.hasText(filter.getArtist())) {
                predicates.add(cb.equal(cb.lower(root.get("artist")), 
                        filter.getArtist().toLowerCase()));
            }
            
            // Filtro por álbum
            if (StringUtils.hasText(filter.getAlbum())) {
                predicates.add(cb.equal(cb.lower(root.get("album")), 
                        filter.getAlbum().toLowerCase()));
            }
            
            // Filtro por género
            if (StringUtils.hasText(filter.getGenre())) {
                predicates.add(cb.equal(cb.lower(root.get("genre")), 
                        filter.getGenre().toLowerCase()));
            }
            
            // Filtro por rating mínimo
            if (filter.getMinRating() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("rating"), 
                        filter.getMinRating()));
            }
            
            // Filtro por rating máximo
            if (filter.getMaxRating() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("rating"), 
                        filter.getMaxRating()));
            }
            
            // Filtro por letras
            if (filter.getHasLyrics() != null) {
                if (filter.getHasLyrics()) {
                    predicates.add(cb.isNotNull(root.get("lyrics")));
                    predicates.add(cb.notEqual(root.get("lyrics"), ""));
                } else {
                    predicates.add(cb.or(
                            cb.isNull(root.get("lyrics")),
                            cb.equal(root.get("lyrics"), "")
                    ));
                }
            }
            
            // Filtro por notas
            if (filter.getHasNotes() != null) {
                if (filter.getHasNotes()) {
                    predicates.add(cb.isNotNull(root.get("notes")));
                    predicates.add(cb.notEqual(root.get("notes"), ""));
                } else {
                    predicates.add(cb.or(
                            cb.isNull(root.get("notes")),
                            cb.equal(root.get("notes"), "")
                    ));
                }
            }
            
            // Filtro por IDs específicos
            if (filter.getIds() != null && !filter.getIds().isEmpty()) {
                predicates.add(root.get("id").in(filter.getIds()));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
