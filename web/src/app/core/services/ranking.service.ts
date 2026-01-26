import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Song } from '../../models/song.model';

/**
 * Servicio para gestión del ranking personal de canciones.
 */
@Injectable({
  providedIn: 'root'
})
export class RankingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/ranking';
  
  /**
   * Obtiene las canciones ordenadas por ranking.
   * Las rankeadas primero con su posición visual, luego las sin rankear.
   */
  getRankedSongs(): Observable<Song[]> {
    return this.http.get<Song[]>(this.baseUrl);
  }
  
  /**
   * Añade una canción al ranking en una posición específica.
   * @param songId ID de la canción
   * @param position Posición deseada (1 = primera favorita)
   */
  addToRanking(songId: number, position: number): Observable<Song> {
    return this.http.post<Song>(`${this.baseUrl}/${songId}`, { position });
  }
  
  /**
   * Mueve una canción a una nueva posición en el ranking.
   * @param songId ID de la canción
   * @param position Nueva posición
   */
  moveInRanking(songId: number, position: number): Observable<Song> {
    return this.http.put<Song>(`${this.baseUrl}/${songId}`, { position });
  }
  
  /**
   * Quita una canción del ranking.
   * @param songId ID de la canción
   */
  removeFromRanking(songId: number): Observable<Song> {
    return this.http.delete<Song>(`${this.baseUrl}/${songId}`);
  }
}
