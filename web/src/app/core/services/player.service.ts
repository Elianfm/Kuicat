import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../models/song.model';

/**
 * Servicio central de reproducción multimedia.
 * Maneja el elemento <video> HTML5 para audio y video.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api';
  
  // Elemento multimedia (video funciona para audio y video)
  private mediaElement: HTMLVideoElement | null = null;
  
  // Estado reactivo
  private readonly _currentSong = signal<Song | null>(null);
  private readonly _isPlaying = signal(false);
  private readonly _volume = signal(75);
  private readonly _currentTime = signal(0);
  private readonly _duration = signal(0);
  private readonly _isVideo = signal(false);
  private readonly _queue = signal<Song[]>([]);
  private readonly _queueIndex = signal(0);
  private readonly _isLoading = signal(false);
  
  // Señales públicas (solo lectura)
  readonly currentSong = this._currentSong.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly isVideo = this._isVideo.asReadonly();
  readonly queue = this._queue.asReadonly();
  readonly queueIndex = this._queueIndex.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  
  // Computados
  readonly progressPercent = computed(() => {
    const dur = this._duration();
    return dur > 0 ? (this._currentTime() / dur) * 100 : 0;
  });
  
  readonly formattedCurrentTime = computed(() => this.formatTime(this._currentTime()));
  readonly formattedDuration = computed(() => this.formatTime(this._duration()));
  
  readonly hasNext = computed(() => this._queueIndex() < this._queue().length - 1);
  readonly hasPrevious = computed(() => this._queueIndex() > 0);
  
  readonly nextSong = computed(() => {
    const queue = this._queue();
    const index = this._queueIndex();
    return index < queue.length - 1 ? queue[index + 1] : null;
  });
  
  // Formatos de video
  private readonly VIDEO_FORMATS = new Set(['mp4', 'webm', 'mkv']);
  
  /**
   * Inicializa el servicio con el elemento de video.
   * Debe llamarse desde el componente principal.
   */
  initMediaElement(element: HTMLVideoElement): void {
    this.mediaElement = element;
    
    // Event listeners
    element.addEventListener('timeupdate', () => {
      this._currentTime.set(element.currentTime);
    });
    
    element.addEventListener('durationchange', () => {
      this._duration.set(element.duration || 0);
    });
    
    element.addEventListener('ended', () => {
      this.onMediaEnded();
    });
    
    element.addEventListener('play', () => {
      this._isPlaying.set(true);
    });
    
    element.addEventListener('pause', () => {
      this._isPlaying.set(false);
    });
    
    element.addEventListener('loadedmetadata', () => {
      this._isLoading.set(false);
      this._duration.set(element.duration || 0);
    });
    
    element.addEventListener('waiting', () => {
      this._isLoading.set(true);
    });
    
    element.addEventListener('canplay', () => {
      this._isLoading.set(false);
    });
    
    element.addEventListener('error', (e) => {
      console.error('Error de reproducción:', e);
      this._isLoading.set(false);
    });
    
    // Aplicar volumen inicial
    element.volume = this._volume() / 100;
  }
  
  /**
   * Carga y reproduce una canción.
   */
  async playSong(song: Song): Promise<void> {
    if (!this.mediaElement) {
      console.error('MediaElement no inicializado');
      return;
    }
    
    this._isLoading.set(true);
    this._currentSong.set(song);
    
    // Determinar si es video
    const format = this.getFormat(song.filePath);
    this._isVideo.set(this.VIDEO_FORMATS.has(format));
    
    // Establecer source con streaming URL
    const streamUrl = `${this.baseUrl}/media/${song.id}/stream`;
    this.mediaElement.src = streamUrl;
    
    try {
      await this.mediaElement.play();
    } catch (error) {
      console.error('Error al reproducir:', error);
      this._isLoading.set(false);
    }
  }
  
  /**
   * Carga una lista de canciones como queue.
   * @param autoPlay Si es true, reproduce la primera canción. Por defecto false para evitar errores de autoplay del navegador.
   */
  async loadQueue(songs: Song[], startIndex = 0, autoPlay = false): Promise<void> {
    this._queue.set(songs);
    this._queueIndex.set(startIndex);
    
    if (songs.length > 0 && startIndex < songs.length) {
      const song = songs[startIndex];
      
      // Establecer la canción actual para mostrar info
      this._currentSong.set(song);
      
      // Detectar si es video
      const format = this.getFormat(song.filePath);
      this._isVideo.set(this.VIDEO_FORMATS.has(format));
      
      // Preparar el source para que togglePlay funcione
      if (this.mediaElement) {
        const streamUrl = `${this.baseUrl}/media/${song.id}/stream`;
        this.mediaElement.src = streamUrl;
        // Cargar metadata sin reproducir
        this.mediaElement.load();
      }
      
      // Solo reproducir si autoPlay está activado (requiere interacción del usuario previa)
      if (autoPlay) {
        await this.playSong(song);
      }
    }
  }
  
  /**
   * Alterna play/pause.
   */
  togglePlay(): void {
    if (!this.mediaElement) return;
    
    if (this._isPlaying()) {
      this.mediaElement.pause();
    } else {
      this.mediaElement.play().catch(console.error);
    }
  }
  
  /**
   * Pausa la reproducción.
   */
  pause(): void {
    this.mediaElement?.pause();
  }
  
  /**
   * Reanuda la reproducción.
   */
  play(): void {
    this.mediaElement?.play().catch(console.error);
  }
  
  /**
   * Siguiente canción en la queue.
   */
  async next(): Promise<void> {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      this._queueIndex.set(nextIndex);
      await this.playSong(queue[nextIndex]);
    }
  }
  
  /**
   * Canción anterior en la queue.
   */
  async previous(): Promise<void> {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    // Si han pasado más de 3 segundos, reiniciar canción actual
    if (this._currentTime() > 3) {
      this.seek(0);
      return;
    }
    
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this._queueIndex.set(prevIndex);
      await this.playSong(queue[prevIndex]);
    } else {
      this.seek(0);
    }
  }
  
  /**
   * Seek a una posición específica (segundos).
   */
  seek(time: number): void {
    if (this.mediaElement) {
      this.mediaElement.currentTime = time;
      this._currentTime.set(time);
    }
  }
  
  /**
   * Seek por porcentaje (0-100).
   */
  seekPercent(percent: number): void {
    const duration = this._duration();
    if (duration > 0) {
      this.seek((percent / 100) * duration);
    }
  }
  
  /**
   * Establece el volumen (0-100).
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    this._volume.set(clampedVolume);
    
    if (this.mediaElement) {
      this.mediaElement.volume = clampedVolume / 100;
    }
  }
  
  /**
   * Reproduce una canción específica de la queue por índice.
   */
  async playFromQueue(index: number): Promise<void> {
    const queue = this._queue();
    if (index >= 0 && index < queue.length) {
      this._queueIndex.set(index);
      await this.playSong(queue[index]);
    }
  }
  
  /**
   * Actualiza parcialmente la canción actual.
   * Útil cuando cambia el ranking u otras propiedades.
   */
  updateCurrentSong(updates: Partial<Song>): void {
    const current = this._currentSong();
    if (current) {
      this._currentSong.set({ ...current, ...updates });
      
      // También actualizar en la queue
      const index = this._queueIndex();
      const queue = this._queue();
      if (index >= 0 && index < queue.length) {
        const updatedQueue = [...queue];
        updatedQueue[index] = { ...queue[index], ...updates };
        this._queue.set(updatedQueue);
      }
    }
  }
  
  /**
   * Recarga la canción actual desde el backend.
   */
  refreshCurrentSong(): void {
    const current = this._currentSong();
    if (!current?.id) return;
    this.refreshSongById(current.id);
  }
  
  /**
   * Recarga una canción específica por ID desde el backend.
   * Actualiza tanto la canción actual (si coincide) como la queue.
   */
  refreshSongById(songId: number): void {
    this.http.get<Song>(`${this.baseUrl}/songs/${songId}`).subscribe({
      next: (updatedSong) => {
        // Actualizar canción actual si coincide
        const current = this._currentSong();
        if (current?.id === songId) {
          this._currentSong.set(updatedSong);
        }
        
        // Actualizar en la queue
        const queue = this._queue();
        const queueIndex = queue.findIndex(s => s.id === songId);
        if (queueIndex >= 0) {
          const updatedQueue = [...queue];
          updatedQueue[queueIndex] = updatedSong;
          this._queue.set(updatedQueue);
        }
      },
      error: (err) => console.error('Error recargando canción:', err)
    });
  }
  
  /**
   * Recarga la canción actual Y la siguiente.
   * Útil cuando cambia el ranking porque puede afectar posiciones de ambas.
   */
  refreshVisibleSongs(): void {
    const current = this._currentSong();
    const next = this.nextSong();
    
    if (current?.id) {
      this.refreshSongById(current.id);
    }
    if (next?.id) {
      this.refreshSongById(next.id);
    }
  }
  
  /**
   * Obtiene el elemento de video para mostrarlo en la UI.
   */
  getMediaElement(): HTMLVideoElement | null {
    return this.mediaElement;
  }
  
  private onMediaEnded(): void {
    // Reproducir siguiente automáticamente
    if (this.hasNext()) {
      this.next();
    } else {
      this._isPlaying.set(false);
    }
  }
  
  private getFormat(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > 0 ? filePath.substring(lastDot + 1).toLowerCase() : '';
  }
  
  private formatTime(seconds: number): string {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
