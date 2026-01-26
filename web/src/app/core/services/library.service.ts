import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

/**
 * Servicio para gestión de la biblioteca musical.
 * Escaneo, limpieza y configuración.
 */
@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/library';
  
  /**
   * Escanea una carpeta de música para añadir canciones.
   */
  scanFolder(folderPath: string): Observable<ScanResult> {
    return this.http.post<ScanResult>(`${this.baseUrl}/scan`, { folderPath });
  }
  
  /**
   * Limpia canciones huérfanas (archivos que ya no existen).
   */
  cleanup(): Observable<CleanupResult> {
    return this.http.post<CleanupResult>(`${this.baseUrl}/cleanup`, {});
  }
}
