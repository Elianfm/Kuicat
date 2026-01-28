import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Playlist, PlaylistCreate } from '../../models/playlist.model';
import { Song } from '../../models/song.model';

/**
 * Servicio para gestión de playlists.
 * Mantiene estado centralizado y sincroniza con el backend.
 */
@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/playlists';
  
  // Estado centralizado
  private readonly _playlists = signal<Playlist[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Getters públicos
  readonly playlists = this._playlists.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed
  readonly totalPlaylists = computed(() => this._playlists().length);
  
  constructor() {
    // Cargar playlists al iniciar
    this.loadPlaylists();
  }
  
  /**
   * Carga todas las playlists del backend.
   */
  loadPlaylists(): void {
    this._loading.set(true);
    this._error.set(null);
    
    this.http.get<Playlist[]>(this.baseUrl).pipe(
      tap(playlists => {
        this._playlists.set(playlists);
        this._loading.set(false);
      }),
      catchError(err => {
        console.error('Error cargando playlists:', err);
        this._error.set('Error al cargar playlists');
        this._loading.set(false);
        return of([]);
      })
    ).subscribe();
  }
  
  /**
   * Obtiene una playlist por ID.
   */
  getById(id: number): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.baseUrl}/${id}`);
  }
  
  /**
   * Obtiene las canciones de una playlist.
   */
  getPlaylistSongs(id: number): Observable<Song[]> {
    return this.http.get<Song[]>(`${this.baseUrl}/${id}/songs`);
  }
  
  /**
   * Crea una nueva playlist.
   */
  create(data: PlaylistCreate): Observable<Playlist> {
    return this.http.post<Playlist>(this.baseUrl, data).pipe(
      tap(playlist => {
        this._playlists.update(playlists => [...playlists, playlist]);
      })
    );
  }
  
  /**
   * Actualiza una playlist.
   */
  update(id: number, data: Partial<PlaylistCreate>): Observable<Playlist> {
    return this.http.put<Playlist>(`${this.baseUrl}/${id}`, data).pipe(
      tap(updated => {
        this._playlists.update(playlists =>
          playlists.map(p => p.id === id ? updated : p)
        );
      })
    );
  }
  
  /**
   * Elimina una playlist.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this._playlists.update(playlists =>
          playlists.filter(p => p.id !== id)
        );
      })
    );
  }
  
  /**
   * Añade una canción a una playlist.
   */
  addSong(playlistId: number, songId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${playlistId}/songs`, { songId }).pipe(
      tap(() => {
        this._playlists.update(playlists =>
          playlists.map(p => {
            if (p.id === playlistId && !p.songIds.includes(songId)) {
              return {
                ...p,
                songIds: [...p.songIds, songId],
                songCount: p.songCount + 1
              };
            }
            return p;
          })
        );
      })
    );
  }
  
  /**
   * Elimina una canción de una playlist.
   */
  removeSong(playlistId: number, songId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${playlistId}/songs/${songId}`).pipe(
      tap(() => {
        this._playlists.update(playlists =>
          playlists.map(p => {
            if (p.id === playlistId && p.songIds.includes(songId)) {
              return {
                ...p,
                songIds: p.songIds.filter(id => id !== songId),
                songCount: p.songCount - 1
              };
            }
            return p;
          })
        );
      })
    );
  }
  
  /**
   * Reordena las canciones de una playlist.
   */
  reorderSongs(playlistId: number, songIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${playlistId}/songs/order`, { songIds }).pipe(
      tap(() => {
        this._playlists.update(playlists =>
          playlists.map(p => {
            if (p.id === playlistId) {
              return { ...p, songIds };
            }
            return p;
          })
        );
      })
    );
  }
  
  /**
   * Verifica si una canción está en una playlist.
   */
  isSongInPlaylist(playlistId: number, songId: number): boolean {
    const playlist = this._playlists().find(p => p.id === playlistId);
    return playlist?.songIds.includes(songId) ?? false;
  }
  
  /**
   * Obtiene las playlists que contienen una canción.
   */
  getPlaylistsContainingSong(songId: number): Playlist[] {
    return this._playlists().filter(p => p.songIds.includes(songId));
  }
}
