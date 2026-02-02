import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../models/song.model';
import { PlayMode, PersistedPlayerState } from '../../models/player-state.model';
import { RadioService } from './radio.service';
import { PlayerStateService } from './player-state.service';
import { RadioContext, RadioAnnouncement } from '../../models/radio.model';

/**
 * Servicio central de reproducción multimedia.
 * Maneja el elemento <video> HTML5 para audio y video.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly http = inject(HttpClient);
  private readonly radioService = inject(RadioService);
  private readonly playerStateService = inject(PlayerStateService);
  private readonly baseUrl = 'http://localhost:8741/api';
  
  // Elemento multimedia (video funciona para audio y video)
  private mediaElement: HTMLVideoElement | null = null;
  
  // Elemento de audio para anuncios de radio
  private radioAudioElement: HTMLAudioElement | null = null;
  private radioAudioElement2: HTMLAudioElement | null = null; // Para modo dual

  // Cache para pre-generación de anuncios de radio
  private pendingRadioAnnouncement: RadioAnnouncement | null = null;
  private lastPlayedAnnouncement: RadioAnnouncement | null = null; // Para botón anterior
  private isPreGenerating = false;
  private isFadingOut = false; // Para evitar múltiples fade outs
  private readonly FADE_OUT_DURATION = 5000; // 5 segundos de fade out (más notable)
  private readonly BACKGROUND_MUSIC_VOLUME = 0.2; // 20% volumen de música de fondo durante anuncio

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
  
  // Estado de radio - indica si la siguiente transición tendrá anuncio
  private readonly _nextTransitionHasAnnouncement = signal(false);
  
  // Estado de radio - indica si actualmente se está reproduciendo un anuncio
  private readonly _isPlayingRadioAnnouncement = signal(false);
  
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
  readonly nextTransitionHasAnnouncement = this._nextTransitionHasAnnouncement.asReadonly();
  readonly isPlayingRadioAnnouncement = this._isPlayingRadioAnnouncement.asReadonly();
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
   * Actualiza el título del documento según el estado actual.
   */
  private updateDocumentTitle(): void {
    const song = this._currentSong();
    const isPlaying = this._isPlaying();
    const isRadioAnnouncement = this._isPlayingRadioAnnouncement();
    
    if (isRadioAnnouncement) {
      document.title = '📻 On Air | Kuicat';
    } else if (song) {
      const icon = isPlaying ? '🎵' : '⏸️';
      const artist = song.artist || 'Unknown';
      document.title = `${icon} ${song.title} - ${artist} | Kuicat`;
    } else {
      document.title = 'Kuicat';
    }
  }
  
  /**
   * Inicializa el servicio con el elemento de video.
   * Debe llamarse desde el componente principal.
   */
  initMediaElement(element: HTMLVideoElement): void {
    this.mediaElement = element;
    
    // Event listeners
    element.addEventListener('timeupdate', () => {
      this._currentTime.set(element.currentTime);
      
      // Fade out anticipado si hay anuncio pendiente
      this.checkForAnticipatedFadeOut();
    });
    
    element.addEventListener('durationchange', () => {
      this._duration.set(element.duration || 0);
    });
    
    element.addEventListener('ended', () => {
      this.onMediaEnded();
    });
    
    element.addEventListener('play', () => {
      this._isPlaying.set(true);
      this.updateDocumentTitle();
    });
    
    element.addEventListener('pause', () => {
      this._isPlaying.set(false);
      this.updateDocumentTitle();
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
    
    // Iniciar auto-guardado de estado
    this.playerStateService.startAutoSave(() => this.getPersistedState());
    
    // Intentar restaurar estado anterior
    this.restoreState();
  }
  
  /**
   * Obtiene el estado actual para persistir.
   */
  private getPersistedState(): PersistedPlayerState {
    return {
      currentSongId: this._currentSong()?.id,
      queuePosition: this._currentTime(),
      volume: this._volume() / 100,
      isPlaying: this._isPlaying(),
      queueSongIds: this._queue().map(s => s.id),
      queueIndex: this._queueIndex(),
      playlistId: this._activePlaylistId() ?? undefined,
      shuffleMode: this._playMode() === 'shuffle',
      repeatMode: 'none', // TODO: si agregamos repeat mode
      rankingFilter: this.getRankingFilterFromPlayMode(this._playMode())
    };
  }
  
  /**
   * Convierte PlayMode a rankingFilter string.
   */
  private getRankingFilterFromPlayMode(mode: PlayMode): string | undefined {
    if (mode.startsWith('top-')) {
      return mode;
    }
    if (mode === 'by-ranking') {
      return 'all-ranked';
    }
    if (mode === 'unranked') {
      return 'unranked';
    }
    return undefined;
  }
  
  /**
   * Restaura el estado del reproductor desde la BD.
   */
  private async restoreState(): Promise<void> {
    try {
      const state = await this.playerStateService.getState();
      
      // Solo restaurar si hay algo guardado
      if (!state.currentSongId && (!state.queueSongIds || state.queueSongIds.length === 0)) {
        return;
      }
      
      // Restaurar volumen
      if (state.volume !== undefined) {
        this._volume.set(Math.round(state.volume * 100));
        if (this.mediaElement) {
          this.mediaElement.volume = state.volume;
        }
      }
      
      // Restaurar cola si hay
      if (state.queueSongIds && state.queueSongIds.length > 0) {
        // Cargar las canciones de la cola desde el servidor
        const songsResponse = await fetch(`${this.baseUrl}/songs/by-ids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.queueSongIds)
        });
        
        if (songsResponse.ok) {
          const songs: Song[] = await songsResponse.json();
          
          // Ordenar según el orden guardado
          const songMap = new Map(songs.map(s => [s.id, s]));
          const orderedQueue = state.queueSongIds
            .map(id => songMap.get(id))
            .filter((s): s is Song => s !== undefined);
          
          if (orderedQueue.length > 0) {
            this._queue.set(orderedQueue);
            this._queueIndex.set(state.queueIndex || 0);
            this._activePlaylistId.set(state.playlistId ?? null);
            
            // Establecer canción actual
            const currentSong = orderedQueue[state.queueIndex || 0];
            if (currentSong) {
              this._currentSong.set(currentSong);
              
              // Determinar si es video
              const format = this.getFormat(currentSong.filePath);
              this._isVideo.set(this.VIDEO_FORMATS.has(format));
              
              // Cargar la canción pero no reproducir automáticamente
              if (this.mediaElement) {
                const streamUrl = `${this.baseUrl}/media/${currentSong.id}/stream`;
                this.mediaElement.src = streamUrl;
                
                // Restaurar posición cuando los metadatos se carguen
                const position = state.queuePosition || 0;
                if (position > 0) {
                  this.mediaElement.addEventListener('loadedmetadata', () => {
                    if (this.mediaElement && position < this.mediaElement.duration) {
                      this.mediaElement.currentTime = position;
                    }
                  }, { once: true });
                }
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('[PlayerService] Error restoring state:', error);
    }
  }
  
  /**
   * Carga y reproduce una canción.
   * @param song La canción a reproducir
   * @param skipPreGeneration Si es true, no pre-genera el anuncio de radio (útil cuando viene de transición de radio)
   */
  async playSong(song: Song, skipPreGeneration = false): Promise<void> {
    if (!this.mediaElement) {
      console.error('MediaElement no inicializado');
      return;
    }
    
    // Reset estados de transición
    this.isFadingOut = false;
    
    this._isLoading.set(true);
    this._currentSong.set(song);
    
    // Restaurar volumen normal
    this.mediaElement.volume = this._volume() / 100;
    
    // Determinar si es video
    const format = this.getFormat(song.filePath);
    this._isVideo.set(this.VIDEO_FORMATS.has(format));
    
    // Establecer source con streaming URL
    const streamUrl = `${this.baseUrl}/media/${song.id}/stream`;
    this.mediaElement.src = streamUrl;
    
    try {
      await this.mediaElement.play();
      this.updateDocumentTitle();
      
      // Pre-generar anuncio de radio para la siguiente transición
      // (salvo que venga de una transición de radio, que lo hace manualmente después)
      if (!skipPreGeneration) {
        this.preGenerateRadioAnnouncement();
      }
      
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
   * Fuerza la pre-generación del anuncio de radio.
   * Útil cuando se activa el modo radio para tener el anuncio listo de inmediato.
   */
  async triggerRadioPreGeneration(): Promise<void> {
    await this.preGenerateRadioAnnouncement();
  }

  /**
   * Siguiente canción en la queue.
   * También verifica si toca anuncio de radio.
   */
  async next(): Promise<void> {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    if (currentIndex < queue.length - 1) {
      // Verificar si hay un anuncio pre-generado listo (skip manual también cuenta)
      if (this.radioService.isEnabled() && this.pendingRadioAnnouncement) {
        await this.radioService.checkForAnnouncement().toPromise();
        await this.playRadioAnnouncementAndTransition();
        return;
      }
      
      // Verificar si toca anuncio de radio
      if (this.radioService.isEnabled()) {
        try {
          const checkResult = await this.radioService.checkForAnnouncement().toPromise();
          
          if (checkResult?.shouldAnnounce) {
            await this.playRadioAnnouncementAndTransition();
            return;
          }
        } catch (error) {
          // Silently continue without announcement
        }
      }
      
      // Sin anuncio, ir directo a siguiente
      const nextIndex = currentIndex + 1;
      this._queueIndex.set(nextIndex);
      await this.playSong(queue[nextIndex]);
    }
  }
  
  /**
   * Canción anterior en la queue.
   * Si hay un anuncio reproducido recientemente, lo vuelve a reproducir.
   */
  async previous(): Promise<void> {
    // Si hay un anuncio reproducido recientemente y estamos en los primeros 5 segundos
    if (this.lastPlayedAnnouncement?.audioUrl && this._currentTime() < 5) {
      await this.replayLastAnnouncement();
      return;
    }
    
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
   * Reproduce el último anuncio de radio que se reprodujo.
   */
  private async replayLastAnnouncement(): Promise<void> {
    if (!this.lastPlayedAnnouncement?.audioUrl) return;
    
    // Pausar música actual y hacer fade out rápido
    if (this.mediaElement) {
      await this.performQuickFadeOut();
    }
    
    this._isPlayingRadioAnnouncement.set(true);
    this.updateDocumentTitle();
    
    try {
      const announcement = this.lastPlayedAnnouncement;
      const isMulti = announcement.audioUrl.startsWith('multi:') || announcement.audioUrl.startsWith('dual:');
      
      if (isMulti) {
        const urls = this.radioService.parseMultiAudioUrl(announcement.audioUrl);
        if (urls && urls.length > 0) {
          await this.playMultiRadioAudio(urls);
        }
      } else {
        await this.playRadioAudio(announcement.audioUrl);
      }
    } catch {
      // Silently handle error
    } finally {
      this._isPlayingRadioAnnouncement.set(false);
      this.updateDocumentTitle();
      
      // Restaurar volumen
      if (this.mediaElement) {
        this.mediaElement.volume = this._volume() / 100;
        this.mediaElement.play().catch(() => {});
      }
      this.resetFadeState();
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
  
  private async onMediaEnded(): Promise<void> {
    // Si estamos en medio de un fade con anuncio, ignorar (ya se manejó)
    if (this.isFadingOut || this._isPlayingRadioAnnouncement()) {
      return;
    }
    
    // Verificar si hay siguiente canción
    if (!this.hasNext()) {
      this._isPlaying.set(false);
      return;
    }
    
    // Verificar si hay un anuncio pre-generado listo (caso raro: canción muy corta)
    if (this.radioService.isEnabled() && this.pendingRadioAnnouncement) {
      // Incrementar el contador del backend (el anuncio ya fue generado antes)
      await this.radioService.checkForAnnouncement().toPromise();
      await this.playRadioAnnouncementAndTransition();
      return;
    }
    
    // Verificar si el modo radio está activo y si toca anuncio (fallback si no hay pre-generado)
    if (this.radioService.isEnabled()) {
      try {
        const checkResult = await this.radioService.checkForAnnouncement().toPromise();
        
        if (checkResult?.shouldAnnounce) {
          // Generar y reproducir anuncio de radio
          await this.playRadioAnnouncementAndTransition();
          return;
        }
      } catch {
        // Silently continue without announcement
      }
    }
    
    // Sin anuncio de radio, reproducir siguiente directamente
    this.next();
  }
  
  /**
   * Reproduce un anuncio de radio con transiciones de fade.
   * Flujo: FadeOut música actual -> Silencio -> Anuncio -> Silencio -> FadeIn siguiente canción
   * Usa el anuncio pre-generado si está disponible, sino genera uno nuevo.
   */
  private async playRadioAnnouncementAndTransition(): Promise<void> {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    const nextSong = queue[currentIndex + 1];
    
    if (!nextSong) {
      this.next();
      return;
    }
    
    try {
      let announcement: RadioAnnouncement | null = null;
      
      // Usar anuncio pre-generado si está disponible
      if (this.pendingRadioAnnouncement) {
        announcement = this.pendingRadioAnnouncement;
        this.pendingRadioAnnouncement = null; // Limpiar cache
      } else {
        // Fallback: generar on-demand - hacer fade out mientras generamos
        
        // Fade out rápido mientras esperamos generación
        if (this.mediaElement && !this.isFadingOut) {
          await this.performQuickFadeOut();
        }
        
        const context: RadioContext = this.buildRadioContext(currentSong, nextSong);
        announcement = await this.radioService.generateAnnouncement(context).toPromise() ?? null;
      }
      
      if (!announcement?.audioUrl) {
        this.resetFadeState();
        this.next();
        return;
      }
      
      // Guardar para poder reproducir de nuevo con botón anterior
      this.lastPlayedAnnouncement = announcement;
      
      const transition = announcement.transition;
      
      // Asegurar que el volumen está en el nivel de fondo (por fade anticipado)
      // La música sigue sonando bajita durante el anuncio
      if (this.mediaElement) {
        this.mediaElement.volume = this.BACKGROUND_MUSIC_VOLUME;
      }
      
      // 1. Pre-silencio antes del anuncio
      await this.sleep(transition.preSilence);
      
      // 2. Marcar que estamos reproduciendo anuncio
      this._isPlayingRadioAnnouncement.set(true);
      this.updateDocumentTitle();
      
      // 3. Reproducir anuncio (puede ser multi, dual o simple)
      const isMulti = announcement.audioUrl.startsWith('multi:') || announcement.audioUrl.startsWith('dual:');
      
      if (isMulti) {
        const urls = this.radioService.parseMultiAudioUrl(announcement.audioUrl);
        if (urls && urls.length > 0) {
          await this.playMultiRadioAudio(urls);
        }
      } else {
        await this.playRadioAudio(announcement.audioUrl);
      }
      
      // Limpiar flags
      this._isPlayingRadioAnnouncement.set(false);
      this._nextTransitionHasAnnouncement.set(false);
      
      // 4. Post-silencio: mínimo 5 segundos con música de fondo
      const postSilenceMs = Math.max(transition.postSilence, 5000);
      await this.sleep(postSilenceMs);
      
      // 5. Avanzar a la siguiente canción
      this._queueIndex.set(currentIndex + 1);
      
      // 6. Fade in de la siguiente canción y resetear estado
      await this.fadeInAndPlaySong(nextSong, transition.fadeInDuration);
      this.resetFadeState();
      
      // 7. Ahora pre-generar anuncio para la SIGUIENTE transición
      // (después de que el índice ya se actualizó correctamente)
      this.preGenerateRadioAnnouncement();
      
    } catch (error) {
      this._isPlayingRadioAnnouncement.set(false);
      this._nextTransitionHasAnnouncement.set(false);
      this.updateDocumentTitle();
      this.resetFadeState();
      this.next();
    }
  }
  
  /**
   * Reproduce un audio de anuncio de radio con amplificación.
   * Usa Web Audio API para aumentar el volumen de los locutores.
   */
  private async playRadioAudio(url: string): Promise<void> {
    // Convertir URL externa a proxy local
    const proxyUrl = this.radioService.toProxyUrl(url);
    
    try {
      // Crear contexto de audio
      const AudioContextClass = globalThis.AudioContext || (globalThis as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Descargar audio
      const response = await fetch(proxyUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Crear source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Crear nodo de ganancia para amplificación
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.5; // Amplificar 2.5x
      
      // Conectar: source -> gain -> output
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Reproducir y esperar que termine
      await new Promise<void>((resolve) => {
        source.onended = () => {
          audioContext.close();
          resolve();
        };
        source.start(0);
      });
      
    } catch {
      // Fallback a audio HTML simple
      this.radioAudioElement ??= document.createElement('audio');
      
      const audio = this.radioAudioElement;
      audio.src = proxyUrl;
      audio.volume = 1;
      
      await new Promise<void>((resolve, reject) => {
        const handleEnded = () => {
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = () => {
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          reject(new Error('Error reproduciendo audio de radio'));
        };
        
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        
        audio.play().catch(reject);
      });
    }
  }
  
  /**
   * Reproduce dos audios de anuncio de radio secuencialmente (modo dual legacy).
   * @deprecated Usar playMultiRadioAudio para el nuevo formato multi:
   */
  private async playDualRadioAudio(url1: string, url2: string): Promise<void> {
    await this.playMultiRadioAudio([url1, url2]);
  }
  
  /**
   * Calcula la duración total de múltiples archivos de audio.
   * Descarga y decodifica cada audio para obtener su duración.
   */
  private async calculateTotalAudioDuration(urls: string[]): Promise<number> {
    let totalDuration = 0;
    const pauseBetweenLines = 350; // ms entre líneas
    
    try {
      const AudioContextClass = globalThis.AudioContext || (globalThis as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      for (const url of urls) {
        const proxyUrl = this.radioService.toProxyUrl(url);
        const response = await fetch(proxyUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0)); // Clone buffer
        totalDuration += audioBuffer.duration * 1000; // convertir a ms
      }
      
      await audioContext.close();
      
      // Añadir pausas entre líneas
      if (urls.length > 1) {
        totalDuration += pauseBetweenLines * (urls.length - 1);
      }
      
      return totalDuration;
      
    } catch {
      // Fallback: estimar 8 segundos por audio
      return urls.length * 8000 + (urls.length > 1 ? pauseBetweenLines * (urls.length - 1) : 0);
    }
  }
  
  /**
   * Reproduce múltiples audios de anuncio de radio secuencialmente.
   * Usado para modo dual con diálogos alternados (3 líneas).
   */
  private async playMultiRadioAudio(urls: string[]): Promise<void> {
    for (let i = 0; i < urls.length; i++) {
      await this.playRadioAudio(urls[i]);
      
      // Pausa entre líneas (excepto después de la última)
      if (i < urls.length - 1) {
        await this.sleep(350); // 350ms entre líneas para conversación natural
      }
    }
  }
  
  /**
   * Inicia la reproducción de una canción con fade in.
   * Comienza desde el volumen de fondo y sube gradualmente.
   */
  private async fadeInAndPlaySong(song: Song, duration: number): Promise<void> {
    const targetVolume = this._volume() / 100;
    const startVolume = this.BACKGROUND_MUSIC_VOLUME;
    
    // Establecer volumen inicial bajo
    if (this.mediaElement) {
      this.mediaElement.volume = startVolume;
    }
    
    // Cargar y empezar a reproducir (skip pre-generation, se hace después con índices correctos)
    await this.playSong(song, true);
    
    // Fade in gradual desde volumen de fondo hasta volumen objetivo
    const steps = 25;
    const stepDuration = duration / steps;
    const volumeDiff = targetVolume - startVolume;
    const volumeStep = volumeDiff / steps;
    
    for (let i = 1; i <= steps; i++) {
      await this.sleep(stepDuration);
      if (this.mediaElement) {
        this.mediaElement.volume = Math.min(startVolume + (volumeStep * i), targetVolume);
      }
    }
  }
  
  /**
   * Construye el contexto para generar un anuncio de radio.
   * Incluye info relevante de las canciones (sin datos sensibles).
   */
  private buildRadioContext(currentSong: Song | undefined, nextSong: Song): RadioContext {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    
    // Obtener las próximas 10 canciones (excluyendo la actual y la siguiente)
    const upcomingSongs: string[] = [];
    for (let i = currentIndex + 2; i < Math.min(currentIndex + 12, queue.length); i++) {
      const song = queue[i];
      if (song) {
        upcomingSongs.push(`${song.title} - ${song.artist || 'Unknown'}`);
      }
    }
    
    return {
      // Canción anterior
      previousTitle: currentSong?.title,
      previousArtist: currentSong?.artist || 'Unknown',
      previousAlbum: currentSong?.album,
      previousGenre: currentSong?.genre,
      previousYear: currentSong?.year ?? undefined,
      previousDescription: currentSong?.description || undefined,
      previousRankPosition: currentSong?.rankPosition ?? undefined,
      
      // Canción siguiente
      nextTitle: nextSong.title,
      nextArtist: nextSong.artist || 'Unknown',
      nextAlbum: nextSong.album,
      nextGenre: nextSong.genre,
      nextYear: nextSong.year ?? undefined,
      nextDescription: nextSong.description || undefined,
      nextRankPosition: nextSong.rankPosition ?? undefined,
      
      // Historial de canciones (el backend guarda las anteriores, solo enviamos las próximas)
      upcomingSongs: upcomingSongs.length > 0 ? upcomingSongs : undefined
    };
  }
  
  /**
   * Utility para esperar ms.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Verifica si debe iniciar fade out anticipado antes del final de la canción.
   * Se ejecuta en cada timeupdate cuando hay un anuncio pendiente.
   */
  private checkForAnticipatedFadeOut(): void {
    // Solo si hay anuncio pendiente y no estamos ya haciendo fade
    if (!this.pendingRadioAnnouncement || this.isFadingOut) {
      return;
    }
    
    if (!this.mediaElement) return;
    
    const currentTime = this.mediaElement.currentTime;
    const duration = this.mediaElement.duration;
    
    if (!duration || duration <= 0) return;
    
    // Calcular segundos restantes
    const remainingTime = duration - currentTime;
    const fadeOutSeconds = this.FADE_OUT_DURATION / 1000;
    
    // Si quedan menos de X segundos, empezar fade out y transición
    if (remainingTime <= fadeOutSeconds && remainingTime > 0) {
      this.isFadingOut = true;
      // Iniciar fade y luego el anuncio (no esperar a onMediaEnded)
      this.performFadeOutAndStartAnnouncement();
    }
  }
  
  /**
   * Realiza el fade out y luego inicia el anuncio de radio.
   * El anuncio comienza al terminar el fade, no al terminar la canción.
   */
  private async performFadeOutAndStartAnnouncement(): Promise<void> {
    if (!this.mediaElement) return;
    
    const initialVolume = this.mediaElement.volume;
    const targetVolume = this.BACKGROUND_MUSIC_VOLUME;
    const volumeDiff = initialVolume - targetVolume;
    const steps = 25;
    const stepDuration = this.FADE_OUT_DURATION / steps;
    const volumeStep = volumeDiff / steps;
    
    // Fade out gradual
    for (let i = 1; i <= steps; i++) {
      await this.sleep(stepDuration);
      if (this.mediaElement) {
        this.mediaElement.volume = Math.max(initialVolume - (volumeStep * i), targetVolume);
      }
    }
    
    // Asegurar volumen de fondo
    if (this.mediaElement) {
      this.mediaElement.volume = targetVolume;
    }
    
    // Pausar canción actual
    this.mediaElement?.pause();
    
    // Incrementar contador en backend
    await this.radioService.checkForAnnouncement().toPromise();
    
    // Iniciar la transición con anuncio
    await this.playRadioAnnouncementWithNextSongBackground();
  }
  
  /**
   * Reproduce el anuncio con la SIGUIENTE canción como música de fondo.
   */
  private async playRadioAnnouncementWithNextSongBackground(): Promise<void> {
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    const nextSong = queue[currentIndex + 1];
    
    if (!nextSong || !this.pendingRadioAnnouncement) {
      this.resetFadeState();
      this._queueIndex.set(currentIndex + 1);
      if (nextSong) {
        await this.playSong(nextSong);
      }
      return;
    }
    
    const announcement = this.pendingRadioAnnouncement;
    this.pendingRadioAnnouncement = null;
    this.lastPlayedAnnouncement = announcement;
    
    try {
      this._isPlayingRadioAnnouncement.set(true);
      this.updateDocumentTitle();
      
      // 1. Pre-silencio
      await this.sleep(announcement.transition.preSilence);
      
      // 2. Preparar URLs del anuncio
      const isMulti = announcement.audioUrl.startsWith('multi:') || announcement.audioUrl.startsWith('dual:');
      const urls = isMulti 
        ? this.radioService.parseMultiAudioUrl(announcement.audioUrl) 
        : [announcement.audioUrl];
      
      if (!urls || urls.length === 0) {
        throw new Error('No audio URLs');
      }
      
      // 3. Calcular duración total del anuncio para timing dinámico
      const totalAnnouncementDuration = await this.calculateTotalAudioDuration(urls);
      
      // 4. Calcular cuándo iniciar la música de fondo (15s antes de que termine el anuncio)
      const BACKGROUND_START_BEFORE_END = 15000; // 15 segundos antes del final
      const MIN_DELAY = 3000; // Mínimo 3 segundos de anuncio solo
      const backgroundStartDelay = Math.max(
        totalAnnouncementDuration - BACKGROUND_START_BEFORE_END,
        MIN_DELAY
      );
      
      // 5. Iniciar música de fondo después del delay calculado
      const startBackgroundMusicAfterDelay = async () => {
        await this.sleep(backgroundStartDelay);
        if (this.mediaElement && this._isPlayingRadioAnnouncement()) {
          this._queueIndex.set(currentIndex + 1);
          this._currentSong.set(nextSong);
          
          const streamUrl = `${this.baseUrl}/media/${nextSong.id}/stream`;
          this.mediaElement.src = streamUrl;
          this.mediaElement.volume = this.BACKGROUND_MUSIC_VOLUME;
          await this.mediaElement.play();
        }
      };
      
      // Lanzar música de fondo en paralelo
      const backgroundMusicPromise = startBackgroundMusicAfterDelay();
      
      // 6. Reproducir el anuncio
      await this.playMultiRadioAudio(urls);
      
      // Esperar a que la música de fondo haya empezado
      await backgroundMusicPromise;
      
      this._isPlayingRadioAnnouncement.set(false);
      this._nextTransitionHasAnnouncement.set(false);
      
      // 7. Fade in de la música a volumen normal
      await this.fadeInFromBackground(announcement.transition.fadeInDuration);
      this.resetFadeState();
      
    } catch {
      this._isPlayingRadioAnnouncement.set(false);
      this._nextTransitionHasAnnouncement.set(false);
      this.updateDocumentTitle();
      this.resetFadeState();
      // Restaurar volumen normal
      if (this.mediaElement) {
        this.mediaElement.volume = this._volume() / 100;
      }
    }
  }
  
  /**
   * Fade in desde el volumen de fondo al volumen normal.
   */
  private async fadeInFromBackground(duration: number): Promise<void> {
    if (!this.mediaElement) return;
    
    const startVolume = this.BACKGROUND_MUSIC_VOLUME;
    const targetVolume = this._volume() / 100;
    const volumeDiff = targetVolume - startVolume;
    const steps = 25;
    const stepDuration = duration / steps;
    const volumeStep = volumeDiff / steps;
    
    for (let i = 1; i <= steps; i++) {
      await this.sleep(stepDuration);
      if (this.mediaElement) {
        this.mediaElement.volume = Math.min(startVolume + (volumeStep * i), targetVolume);
      }
    }
  }
  
  /**
   * Realiza el fade out gradual de la música hacia el volumen de fondo.
   * La música no desaparece completamente, queda muy bajita durante el anuncio.
   */
  private async performFadeOut(): Promise<void> {
    if (!this.mediaElement) return;
    
    const initialVolume = this.mediaElement.volume;
    const targetVolume = this.BACKGROUND_MUSIC_VOLUME;
    const volumeDiff = initialVolume - targetVolume;
    const steps = 25; // Más pasos para fade más suave
    const stepDuration = this.FADE_OUT_DURATION / steps;
    const volumeStep = volumeDiff / steps;
    
    for (let i = 1; i <= steps; i++) {
      await this.sleep(stepDuration);
      if (this.mediaElement) {
        this.mediaElement.volume = Math.max(initialVolume - (volumeStep * i), targetVolume);
      }
    }
    
    // Asegurar que quede en el volumen de fondo
    if (this.mediaElement) {
      this.mediaElement.volume = targetVolume;
    }
  }
  
  /**
   * Fade out rápido cuando se genera anuncio on-demand.
   * Baja al volumen de fondo para música durante el anuncio.
   */
  private async performQuickFadeOut(): Promise<void> {
    if (!this.mediaElement) return;
    
    this.isFadingOut = true;
    const initialVolume = this.mediaElement.volume;
    const targetVolume = this.BACKGROUND_MUSIC_VOLUME;
    const volumeDiff = initialVolume - targetVolume;
    const steps = 10;
    const stepDuration = 80; // 800ms total
    const volumeStep = volumeDiff / steps;
    
    for (let i = 1; i <= steps; i++) {
      await this.sleep(stepDuration);
      if (this.mediaElement) {
        this.mediaElement.volume = Math.max(initialVolume - (volumeStep * i), targetVolume);
      }
    }
    
    if (this.mediaElement) {
      this.mediaElement.volume = targetVolume;
    }
  }
  
  /**
   * Resetea el estado de fade.
   */
  private resetFadeState(): void {
    this.isFadingOut = false;
  }
  
  /**
   * Pre-genera el anuncio de radio para la siguiente transición.
   * Se ejecuta en background cuando empieza una canción para tener el audio listo.
   */
  private async preGenerateRadioAnnouncement(): Promise<void> {
    // Limpiar cache anterior y resetear flag
    this.pendingRadioAnnouncement = null;
    this._nextTransitionHasAnnouncement.set(false);
    this.resetFadeState();
    
    // Verificar si radio está habilitado
    const radioEnabled = this.radioService.isEnabled();
    if (!radioEnabled) {
      return;
    }
    
    // Evitar múltiples generaciones simultáneas
    if (this.isPreGenerating) {
      return;
    }
    
    // Verificar si hay siguiente canción
    const queue = this._queue();
    const currentIndex = this._queueIndex();
    const currentSong = queue[currentIndex];
    const nextSong = queue[currentIndex + 1];

    if (!nextSong) {
      return;
    }
    
    try {
      // Consultar al backend si toca anuncio (sin incrementar el contador)
      const checkResult = await this.radioService.peekForAnnouncement().toPromise();
      
      if (!checkResult?.shouldAnnounce) {
        return;
      }
      
      // Marcar que habrá anuncio en la siguiente transición
      this._nextTransitionHasAnnouncement.set(true);
      
      this.isPreGenerating = true;
      
      // Construir contexto con info completa
      const context: RadioContext = this.buildRadioContext(currentSong, nextSong);
      
      // Generar el anuncio
      const announcement = await this.radioService.generateAnnouncement(context).toPromise();
      
      if (announcement?.audioUrl) {
        this.pendingRadioAnnouncement = announcement;
      }
      
    } catch (error) {
      this._nextTransitionHasAnnouncement.set(false);
    } finally {
      this.isPreGenerating = false;
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
