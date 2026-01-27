import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Song } from '../../models/song.model';

/**
 * Servicio para gestión del ranking personal de canciones.
 * Mantiene un estado centralizado del ranking que todos los componentes pueden observar.
 */
@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/ranking';
  
  // Estado centralizado del ranking
  private readonly _rankedSongs = signal<Song[]>([]);
  private readonly _loading = signal(false);
  
  // Subject para notificar cambios en el ranking
  private readonly _rankingChanged = new Subject<void>();
  readonly rankingChanged$ = this._rankingChanged.asObservable();
  
  // Señales públicas
  readonly rankedSongs = this._rankedSongs.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly totalRanked = computed(() => this._rankedSongs().length);
  
  /**
   * Obtiene la canción en una posición específica del ranking.
   */
  getSongAtPosition(position: number): Song | null {
    const songs = this._rankedSongs();
    return songs.find(s => s.rankPosition === position) || null;
  }
  
  /**
   * Obtiene la canción anterior en el ranking (para tooltip).
   */
  getPreviousSong(currentPosition: number): Song | null {
    return this.getSongAtPosition(currentPosition - 1);
  }
  
  /**
   * Obtiene la canción siguiente en el ranking (para tooltip).
   */
  getNextSong(currentPosition: number): Song | null {
    return this.getSongAtPosition(currentPosition + 1);
  }
  
  /**
   * Carga/recarga las canciones ordenadas por ranking.
   */
  loadRanking(): void {
    this._loading.set(true);
    this.http.get<Song[]>(this.baseUrl).subscribe({
      next: (songs) => {
        // Solo mantener las que tienen rankPosition
        this._rankedSongs.set(songs.filter(s => s.rankPosition !== null && s.rankPosition !== undefined));
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
      }
    });
  }
  
  /**
   * Obtiene las canciones ordenadas por ranking (para compatibilidad).
   */
  getRankedSongs(): Observable<Song[]> {
    return this.http.get<Song[]>(this.baseUrl);
  }
  
  /**
   * Añade una canción al ranking en una posición específica.
   */
  addToRanking(songId: number, position: number): Observable<Song> {
    return this.http.post<Song>(`${this.baseUrl}/${songId}`, { position }).pipe(
      tap(() => {
        this.loadRanking(); // Recargar estado centralizado
        this._rankingChanged.next();
      })
    );
  }
  
  /**
   * Mueve una canción a una nueva posición en el ranking.
   */
  moveInRanking(songId: number, position: number): Observable<Song> {
    return this.http.put<Song>(`${this.baseUrl}/${songId}`, { position }).pipe(
      tap(() => {
        this.loadRanking(); // Recargar estado centralizado
        this._rankingChanged.next();
      })
    );
  }
  
  /**
   * Quita una canción del ranking.
   */
  removeFromRanking(songId: number): Observable<Song> {
    return this.http.delete<Song>(`${this.baseUrl}/${songId}`).pipe(
      tap(() => {
        this.loadRanking(); // Recargar estado centralizado
        this._rankingChanged.next();
      })
    );
  }
}
