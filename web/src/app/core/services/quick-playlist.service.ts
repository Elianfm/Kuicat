import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { CategoryCount, QuickPlaylistType, Song } from '../../models';

/**
 * Servicio para gestión de playlists rápidas.
 * Permite reproducir por artista o género sin crear una playlist permanente.
 */
@Injectable({
  providedIn: 'root'
})
export class QuickPlaylistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/songs';
  
  // Estado de carga
  readonly loading = signal(false);
  
  // Lista de artistas con conteo
  readonly artists = signal<CategoryCount[]>([]);
  
  // Lista de géneros con conteo
  readonly genres = signal<CategoryCount[]>([]);
  
  // Filtro de búsqueda
  readonly searchQuery = signal('');
  
  // Artistas filtrados por búsqueda
  readonly filteredArtists = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.artists();
    return this.artists().filter(a => 
      a.name.toLowerCase().includes(query)
    );
  });
  
  // Géneros filtrados por búsqueda
  readonly filteredGenres = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.genres();
    return this.genres().filter(g => 
      g.name.toLowerCase().includes(query)
    );
  });
  
  // Resultados combinados (para búsqueda unificada)
  readonly searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    const artists = this.filteredArtists().map(a => ({ ...a, type: 'artist' as QuickPlaylistType }));
    const genres = this.filteredGenres().map(g => ({ ...g, type: 'genre' as QuickPlaylistType }));
    
    return [...artists, ...genres].slice(0, 10); // Limitar a 10 resultados
  });
  
  /**
   * Carga artistas y géneros con sus conteos.
   */
  loadCategories(): void {
    this.loading.set(true);
    
    // Cargar ambos en paralelo
    Promise.all([
      this.fetchArtistsWithCount(),
      this.fetchGenresWithCount()
    ]).finally(() => {
      this.loading.set(false);
    });
  }
  
  /**
   * Obtiene artistas con conteo desde el backend.
   */
  private fetchArtistsWithCount(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<CategoryCount[]>(`${this.baseUrl}/artists/count`).pipe(
        tap(artists => this.artists.set(artists)),
        catchError(err => {
          console.error('Error cargando artistas:', err);
          return of([]);
        })
      ).subscribe(() => resolve());
    });
  }
  
  /**
   * Obtiene géneros con conteo desde el backend.
   */
  private fetchGenresWithCount(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<CategoryCount[]>(`${this.baseUrl}/genres/count`).pipe(
        tap(genres => this.genres.set(genres)),
        catchError(err => {
          console.error('Error cargando géneros:', err);
          return of([]);
        })
      ).subscribe(() => resolve());
    });
  }
  
  /**
   * Obtiene canciones de un artista.
   */
  getSongsByArtist(artist: string): Observable<Song[]> {
    return this.http.get<Song[]>(`${this.baseUrl}/by-artist`, {
      params: { name: artist }
    });
  }
  
  /**
   * Obtiene canciones de un género.
   */
  getSongsByGenre(genre: string): Observable<Song[]> {
    return this.http.get<Song[]>(`${this.baseUrl}/by-genre`, {
      params: { name: genre }
    });
  }
  
  /**
   * Limpia el filtro de búsqueda.
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }
}
