import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { Song } from '../../models/song.model';

/**
 * Servicio para obtener y actualizar duraciones de canciones/videos.
 * Usa una cola serializada para evitar conflictos con SQLite.
 */
@Injectable({
  providedIn: 'root'
})
export class DurationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api';
  
  // Procesamiento serializado (1 a la vez para evitar SQLITE_BUSY)
  private isProcessing = false;
  private queue: Song[] = [];
  
  // Set de IDs ya procesados (evitar duplicados)
  private processedIds = new Set<number>();
  
  // Signal para notificar actualizaciones
  private readonly _durationUpdated = new Subject<{ id: number; duration: number }>();
  readonly durationUpdated$ = this._durationUpdated.asObservable();
  
  // Estado de procesamiento
  readonly processing = signal(false);
  readonly pendingCount = signal(0);
  
  /**
   * Encola canciones para obtener su duración.
   * Solo procesa las que tienen duration null o 0.
   */
  queueSongs(songs: Song[]): void {
    const songsNeedingDuration = songs.filter(song => 
      !this.processedIds.has(song.id) && 
      (song.duration === null || song.duration === undefined || song.duration === 0)
    );
    
    if (songsNeedingDuration.length === 0) return;
    
    // Añadir a la cola
    for (const song of songsNeedingDuration) {
      if (!this.queue.some(s => s.id === song.id)) {
        this.queue.push(song);
      }
    }
    
    this.pendingCount.set(this.queue.length);
    this.processing.set(true);
    this.processNext();
  }
  
  /**
   * Procesa la cola de forma serializada (uno a la vez).
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      if (this.queue.length === 0) {
        this.processing.set(false);
      }
      return;
    }
    
    this.isProcessing = true;
    const song = this.queue.shift()!;
    this.pendingCount.set(this.queue.length);
    
    try {
      await this.fetchDuration(song);
    } finally {
      this.processedIds.add(song.id);
      this.isProcessing = false;
      
      // Pequeño delay para evitar saturar SQLite
      await this.delay(150);
      this.processNext();
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Obtiene la duración de un archivo usando preload metadata.
   * Retorna una Promise que se resuelve cuando termina (éxito o error).
   */
  private fetchDuration(song: Song): Promise<void> {
    return new Promise(async (resolve) => {
      const mediaUrl = `${this.baseUrl}/media/${song.id}/stream`;
      
      // Detectar si es video o audio por la extensión
      const isVideo = this.isVideoFile(song.filePath);
      const element = isVideo 
        ? document.createElement('video') 
        : document.createElement('audio');
      
      element.preload = 'metadata';
      
      let resolved = false;
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        element.src = '';
        element.load();
        resolve();
      };
      
      element.onloadedmetadata = async () => {
        const duration = Math.floor(element.duration);
        
        if (duration > 0) {
          try {
            // Esperar a que el PATCH termine antes de continuar
            await firstValueFrom(
              this.http.patch(`${this.baseUrl}/songs/${song.id}`, { duration })
            );
            // Notificar a los componentes
            this._durationUpdated.next({ id: song.id, duration });
          } catch (err) {
            console.error(`Error actualizando duración de ${song.id}:`, err);
          }
        }
        
        cleanup();
      };
      
      element.onerror = () => {
        console.warn(`No se pudo obtener duración de: ${song.title}`);
        cleanup();
      };
      
      // Timeout de seguridad (10 segundos)
      setTimeout(() => {
        if (!resolved) {
          console.warn(`Timeout obteniendo duración de: ${song.title}`);
          cleanup();
        }
      }, 10000);
      
      element.src = mediaUrl;
    });
  }
  
  /**
   * Verifica si el archivo es de video por su extensión.
   */
  private isVideoFile(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext);
  }
  
  /**
   * Limpia el caché de IDs procesados (útil para re-escaneo).
   */
  clearCache(): void {
    this.processedIds.clear();
  }
}
