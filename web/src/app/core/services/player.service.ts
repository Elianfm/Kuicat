import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../models/song.model';
import { PlayMode } from '../../models/player-state.model';

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
  private readonly _activePlaylistId = signal<number | null>(null);
  private readonly _playMode = signal<PlayMode>('sequential');
  private readonly _isReversed = signal(false);
  
  // Cola original (para restaurar al desactivar shuffle)
  private originalQueue: Song[] = [];
  private originalIndex = 0;
  
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
  readonly activePlaylistId = this._activePlaylistId.asReadonly();
  readonly playMode = this._playMode.asReadonly();
  readonly isReversed = this._isReversed.asReadonly();
  
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
  
  /**
   * Canciones pendientes (después de la actual).
   * Incluye índice original para referencia.
   */
  readonly upcomingSongs = computed(() => {
    const queue = this._queue();
    const index = this._queueIndex();
    return queue.slice(index + 1).map((song, i) => ({
      ...song,
      queueIndex: index + 1 + i // Índice real en la cola
    }));
  });
  
  /**
   * Canciones anteriores (antes de la actual).
   * Ordenadas de más reciente a más antigua.
   * Incluye índice original para referencia.
   */
  readonly previousSongs = computed(() => {
    const queue = this._queue();
    const index = this._queueIndex();
    // Desde el inicio hasta antes del actual, invertido
    return queue.slice(0, index).reverse().map((song, i) => ({
      ...song,
      queueIndex: index - 1 - i // Índice real en la cola
    }));
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
   * @param playlistId ID de la playlist origen (para el contexto de UI).
   */
  async loadQueue(songs: Song[], startIndex = 0, autoPlay = false, playlistId: number | null = null): Promise<void> {
    const currentMode = this._playMode();
    const requiresSort = this.isModeThatRequiresSort(currentMode);
    
    // Resetear inversión al cargar nueva cola
    this._isReversed.set(false);
    
    // Si estamos en un modo que requiere ordenar
    if (requiresSort && songs.length > 1) {
      // Guardar cola original
      this.originalQueue = [...songs];
      this.originalIndex = startIndex;
      
      // La canción inicial va al principio
      const startSong = songs[startIndex];
      let rest = songs.filter((_, i) => i !== startIndex);
      
      // Aplicar filtrado según el modo
      rest = this.filterByMode(rest, currentMode);
      
      // Aplicar ordenamiento según el modo
      this.sortRestByMode(rest, currentMode);
      
      this._queue.set([startSong, ...rest]);
      this._queueIndex.set(0);
    } else {
      this._queue.set(songs);
      this._queueIndex.set(startIndex);
    }
    
    this._activePlaylistId.set(playlistId);
    
    const queue = this._queue();
    const index = this._queueIndex();
    
    if (queue.length > 0 && index < queue.length) {
      const song = queue[index];
      
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
      
      // Solo reproducir si autoPlay está activado
      if (autoPlay) {
        await this.playSong(song);
      }
    }
  }
  
  /**
   * Ordena un array de canciones según el modo actual.
   * Modifica el array in-place.
   */
  private sortRestByMode(songs: Song[], mode: PlayMode): void {
    switch (mode) {
      case 'shuffle':
        // Fisher-Yates shuffle
        for (let i = songs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        break;
        
      case 'by-ranking':
      case 'top-50':
      case 'top-100':
      case 'top-200':
      case 'top-300':
      case 'top-400':
      case 'top-500':
        songs.sort((a, b) => (a.rankPosition ?? 0) - (b.rankPosition ?? 0));
        break;
        
      case 'unranked':
        // No requiere ordenamiento especial
        break;
        
      case 'by-artist':
        songs.sort((a, b) => (a.artist ?? '').toLowerCase().localeCompare((b.artist ?? '').toLowerCase()));
        break;
        
      case 'by-genre':
        songs.sort((a, b) => (a.genre ?? '').toLowerCase().localeCompare((b.genre ?? '').toLowerCase()));
        break;
    }
  }
  
  /**
   * Filtra canciones según el modo actual.
   * Retorna un nuevo array con las canciones filtradas.
   */
  private filterByMode(songs: Song[], mode: PlayMode): Song[] {
    switch (mode) {
      case 'by-ranking':
        return songs.filter(s => s.rankPosition != null);
        
      case 'top-50':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 50);
        
      case 'top-100':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 100);
        
      case 'top-200':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 200);
        
      case 'top-300':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 300);
        
      case 'top-400':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 400);
        
      case 'top-500':
        return songs.filter(s => s.rankPosition != null && s.rankPosition <= 500);
        
      case 'unranked':
        return songs.filter(s => s.rankPosition == null);
        
      default:
        return songs;
    }
  }
  
  /**
   * Determina si un modo requiere modificar la cola.
   */
  private isModeThatRequiresSort(mode: PlayMode): boolean {
    return ['shuffle', 'by-ranking', 'top-50', 'top-100', 'top-200', 'top-300', 'top-400', 'top-500', 'unranked', 'by-artist', 'by-genre'].includes(mode);
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
   * Elimina una canción de la cola por índice.
   * No puede eliminar la canción actual.
   */
  removeFromQueue(index: number): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    // No permitir eliminar la canción actual
    if (index === currentIndex || index < 0 || index >= queue.length) {
      return;
    }
    
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    this._queue.set(newQueue);
    
    // Ajustar índice si eliminamos antes de la canción actual
    if (index < currentIndex) {
      this._queueIndex.set(currentIndex - 1);
    }
  }
  
  /**
   * Mueve una canción en la cola de una posición a otra.
   * Para drag & drop.
   */
  moveInQueue(fromIndex: number, toIndex: number): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    if (fromIndex < 0 || fromIndex >= queue.length || 
        toIndex < 0 || toIndex >= queue.length ||
        fromIndex === toIndex) {
      return;
    }
    
    const newQueue = [...queue];
    const [movedItem] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedItem);
    this._queue.set(newQueue);
    
    // Ajustar índice actual si fue afectado por el movimiento
    let newCurrentIndex = currentIndex;
    if (fromIndex === currentIndex) {
      // Movimos la canción actual
      newCurrentIndex = toIndex;
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      // Movimos algo de antes a después
      newCurrentIndex = currentIndex - 1;
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      // Movimos algo de después a antes
      newCurrentIndex = currentIndex + 1;
    }
    this._queueIndex.set(newCurrentIndex);
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

  // ========== PLAY MODE METHODS ==========
  
  /**
   * Cambia el modo de reproducción.
   * @param mode El nuevo modo de reproducción
   */
  setPlayMode(mode: PlayMode): void {
    const currentMode = this._playMode();
    
    // Si no hay cambio, no hacer nada
    if (mode === currentMode) return;
    
    // Resetear inversión al cambiar modo
    this._isReversed.set(false);
    
    // Edge case: Cola vacía
    if (this._queue().length === 0) {
      this._playMode.set(mode);
      return;
    }
    
    // Determinar si el modo actual requiere restaurar orden original
    const requiresRestore = this.isModeThatRequiresSort(currentMode);
    const newRequiresSort = this.isModeThatRequiresSort(mode);
    
    // Si salimos de un modo ordenado, restaurar orden original
    if (requiresRestore && !newRequiresSort) {
      this.restoreOriginalQueue();
    }
    
    // Si entramos a un modo que requiere ordenar
    if (newRequiresSort) {
      // Guardar o restaurar orden original según contexto
      if (requiresRestore) {
        // Restaurar antes de reordenar
        this.restoreOriginalQueue();
      }
      // Siempre guardar el orden actual como original
      this.originalQueue = [...this._queue()];
      this.originalIndex = this._queueIndex();
      
      // Aplicar el ordenamiento según el modo
      this.applySortMode(mode);
    }
    
    this._playMode.set(mode);
  }
  
  /**
   * Aplica el ordenamiento según el modo seleccionado.
   */
  private applySortMode(mode: PlayMode): void {
    switch (mode) {
      case 'shuffle':
        this.shuffleQueue();
        break;
      case 'by-ranking':
        this.sortByRanking();
        break;
      case 'top-50':
        this.sortByRankingTop(50);
        break;
      case 'top-100':
        this.sortByRankingTop(100);
        break;
      case 'top-200':
        this.sortByRankingTop(200);
        break;
      case 'top-300':
        this.sortByRankingTop(300);
        break;
      case 'top-400':
        this.sortByRankingTop(400);
        break;
      case 'top-500':
        this.sortByRankingTop(500);
        break;
      case 'unranked':
        this.filterUnranked();
        break;
      case 'by-artist':
        this.sortByField('artist');
        break;
      case 'by-genre':
        this.sortByField('genre');
        break;
    }
  }
  
  /**
   * Filtra y ordena la cola por ranking.
   * Solo incluye canciones rankeadas (excluye las no rankeadas).
   */
  private sortByRanking(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    
    // Separar canción actual y filtrar solo rankeadas
    const rest = queue
      .filter((s, i) => i !== currentIndex && s.rankPosition != null)
      .sort((a, b) => (a.rankPosition ?? 0) - (b.rankPosition ?? 0));
    
    // Si la canción actual está rankeada, va al inicio; si no, agregarla igual
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
  }
  
  /**
   * Filtra y ordena la cola por ranking, limitado a las primeras N posiciones.
   */
  private sortByRankingTop(limit: number): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    
    // Separar canción actual y filtrar solo rankeadas dentro del límite
    const rest = queue
      .filter((s, i) => i !== currentIndex && s.rankPosition != null && s.rankPosition <= limit)
      .sort((a, b) => (a.rankPosition ?? 0) - (b.rankPosition ?? 0));
    
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
  }
  
  /**
   * Filtra la cola para mostrar solo canciones NO rankeadas.
   * Útil para descubrir canciones que aún no has valorado.
   */
  private filterUnranked(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    
    // Separar canción actual y filtrar solo NO rankeadas
    const rest = queue.filter((s, i) => i !== currentIndex && s.rankPosition == null);
    
    // Canción actual siempre va al inicio
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
  }
  
  /**
   * Ordena la cola por un campo de texto (artista, género, etc).
   */
  private sortByField(field: 'artist' | 'genre'): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    
    // Separar canción actual
    const rest = queue.filter((_, i) => i !== currentIndex);
    
    // Ordenar alfabéticamente por el campo
    rest.sort((a, b) => {
      const aVal = (a[field] ?? '').toLowerCase();
      const bVal = (b[field] ?? '').toLowerCase();
      return aVal.localeCompare(bVal);
    });
    
    // Canción actual al inicio
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
  }
  
  /**
   * Invierte el orden de la cola (excepto la canción actual).
   * Funciona como un toggle: invertir de nuevo restaura el orden.
   */
  toggleReverse(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    // Edge case: Cola con 0, 1 o 2 elementos (invertir no tiene efecto visual)
    if (queue.length <= 2) return;
    
    // Separar canción actual del resto
    const currentSong = queue[currentIndex];
    const rest = queue.filter((_, i) => i !== currentIndex);
    
    // Invertir el resto
    rest.reverse();
    
    // Actualizar cola
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
    
    // Toggle del estado
    this._isReversed.update(v => !v);
  }
  
  /**
   * Mezcla la cola usando Fisher-Yates.
   * La canción actual se mantiene en posición 0.
   * Nota: El orden original ya fue guardado por setPlayMode.
   */
  private shuffleQueue(): void {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    // Edge case: Cola con 0 o 1 elementos
    if (queue.length <= 1) return;
    
    // Separar canción actual del resto
    const currentSong = queue[currentIndex];
    const rest = queue.filter((_, i) => i !== currentIndex);
    
    // Fisher-Yates shuffle
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    
    // Poner canción actual al inicio
    this._queue.set([currentSong, ...rest]);
    this._queueIndex.set(0);
  }
  
  /**
   * Restaura la cola al orden original (antes del shuffle).
   * Mantiene la canción actual en reproducción.
   */
  private restoreOriginalQueue(): void {
    // Edge case: No hay cola original guardada
    if (this.originalQueue.length === 0) return;
    
    const currentSong = this._currentSong();
    
    // Restaurar cola original
    this._queue.set([...this.originalQueue]);
    
    // Encontrar la canción actual en la cola original
    if (currentSong) {
      const newIndex = this.originalQueue.findIndex(s => s.id === currentSong.id);
      this._queueIndex.set(newIndex >= 0 ? newIndex : this.originalIndex);
    } else {
      this._queueIndex.set(this.originalIndex);
    }
    
    // Limpiar guardado
    this.originalQueue = [];
    this.originalIndex = 0;
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
