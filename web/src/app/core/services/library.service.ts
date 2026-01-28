import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Song } from '../../models/song.model';

export interface ScanResult {
  totalFiles: number;
  newSongs: number;
  updatedSongs: number;
  skippedSongs: number;
  errors: number;
  errorMessages: string[];
}

export interface CleanupResult {
  success: boolean;
  removedCount: number;
  message: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * Servicio para gestión de la biblioteca musical.
 * Escaneo, limpieza y configuración.
 */
@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api';
  
  /**
   * Obtiene todas las canciones de la biblioteca.
   */
  getAllSongs(): Observable<Song[]> {
    return this.http.get<PageResponse<Song>>(`${this.baseUrl}/songs?size=1000`).pipe(
      map(response => response.content)
    );
  }
  
  /**
   * Escanea una carpeta de música para añadir canciones.
   */
  scanFolder(folderPath: string): Observable<ScanResult> {
    return this.http.post<ScanResult>(`${this.baseUrl}/library/scan`, { folderPath });
  }
  
  /**
   * Limpia canciones huérfanas (archivos que ya no existen).
   */
  cleanup(): Observable<CleanupResult> {
    return this.http.post<CleanupResult>(`${this.baseUrl}/library/cleanup`, {});
  }
}
