import { Component, input, output, signal, inject, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { ToastService } from '../toast/toast.component';
import { RankingService } from '../../../core/services/ranking.service';
import { PlayerService } from '../../../core/services/player.service';
import { ThumbnailService } from '../../../core/services/thumbnail.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { LibraryService } from '../../../core/services/library.service';
import { PlaylistConfigModalComponent } from '../playlist-config-modal/playlist-config-modal.component';
import { SongSelectorModalComponent } from '../song-selector-modal/song-selector-modal.component';
import { Song } from '../../../models';
import { Playlist } from '../../../models/playlist.model';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, DragDropModule, PlaylistConfigModalComponent, SongSelectorModalComponent],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.scss'
})
export class RightSidebarComponent implements OnInit, OnDestroy, OnChanges {
  private readonly toastService = inject(ToastService);
  private readonly rankingService = inject(RankingService);
  private readonly thumbnailService = inject(ThumbnailService);
  private readonly libraryService = inject(LibraryService);
  readonly playlistService = inject(PlaylistService);
  readonly playerService = inject(PlayerService);
  private rankingChangedSub?: Subscription;
  
  // Señal para forzar re-render cuando se generan thumbnails
  private readonly thumbnailVersion = signal(0);
  
  // Cache de thumbnails (sincronizado con señal)
  private readonly thumbnailCache = new Map<number, string>();
  
  activeView = input<'playlist' | 'queue' | 'ranking' | null>(null);
  currentSongId = input<number>(1); // ID de la canción actual
  
  // Evento para agregar canción actual a una playlist
  addToPlaylist = output<number>();
  
  // Evento para quitar canción actual de una playlist
  removeFromPlaylist = output<number>();
  
  // Evento para reproducir una playlist
  playPlaylist = output<number>();
  
  // Estado de modales
  showConfigModal = signal(false);
  selectedPlaylist = signal<Playlist | null>(null);
  showSongSelector = signal(false);
  selectedPlaylistId = signal<number | null>(null);
  
  // Playlists desde el servicio centralizado
  get playlists() {
    return this.playlistService.playlists;
  }
  
  // Cola de reproducción - ahora viene del PlayerService
  get upcomingSongs() {
    return this.playerService.upcomingSongs();
  }
  
  // Verifica si la canción actual está en una playlist
  isInPlaylist(playlistId: number): boolean {
    return this.playlistService.isSongInPlaylist(playlistId, this.currentSongId());
  }
  
  onAddToPlaylist(playlistId: number): void {
    const playlist = this.playlists().find(p => p.id === playlistId);
    
    this.playlistService.addSong(playlistId, this.currentSongId()).subscribe({
      next: () => {
        if (playlist) {
          this.toastService.success(`Agregada a "${playlist.name}"`);
        }
        this.addToPlaylist.emit(playlistId);
      },
      error: () => {
        this.toastService.error('Error al agregar a playlist');
      }
    });
  }
  
  onRemoveFromPlaylist(playlistId: number): void {
    const playlist = this.playlists().find(p => p.id === playlistId);
    
    this.playlistService.removeSong(playlistId, this.currentSongId()).subscribe({
      next: () => {
        if (playlist) {
          this.toastService.info(`Quitada de "${playlist.name}"`);
        }
        this.removeFromPlaylist.emit(playlistId);
      },
      error: () => {
        this.toastService.error('Error al quitar de playlist');
      }
    });
  }
  
  /**
   * Reproduce toda la biblioteca de canciones.
   */
  onPlayLibrary(): void {
    this.libraryService.getAllSongs().subscribe({
      next: (songs) => {
        if (songs.length > 0) {
          this.playerService.loadQueue(songs, 0, true, null);
          this.toastService.success('Reproduciendo biblioteca completa');
        } else {
          this.toastService.info('La biblioteca está vacía');
        }
      },
      error: () => {
        this.toastService.error('Error al cargar la biblioteca');
      }
    });
  }
  
  onPlayPlaylist(playlistId: number): void {
    const playlist = this.playlists().find(p => p.id === playlistId);
    
    if (!playlist || playlist.songCount === 0) {
      this.toastService.info('La playlist está vacía');
      return;
    }
    
    // Obtener canciones de la playlist y cargarlas en el reproductor
    this.playlistService.getPlaylistSongs(playlistId).subscribe({
      next: (songs) => {
        if (songs.length > 0) {
          this.playerService.loadQueue(songs, 0, true, playlistId);
          this.toastService.success(`Reproduciendo "${playlist.name}"`);
        } else {
          this.toastService.info('La playlist está vacía');
        }
      },
      error: () => {
        this.toastService.error('Error al cargar la playlist');
      }
    });
  }
  
  onCreatePlaylist(): void {
    // Abrir modal para crear nueva playlist
    this.selectedPlaylist.set(null);
    this.showConfigModal.set(true);
  }
  
  onConfigPlaylist(playlist: Playlist): void {
    this.selectedPlaylist.set(playlist);
    this.showConfigModal.set(true);
  }
  
  closeConfigModal(): void {
    this.showConfigModal.set(false);
    this.selectedPlaylist.set(null);
  }
  
  openSongSelector(playlistId: number): void {
    this.selectedPlaylistId.set(playlistId);
    this.showSongSelector.set(true);
  }
  
  closeSongSelector(): void {
    this.showSongSelector.set(false);
    this.selectedPlaylistId.set(null);
  }
  
  onPlaylistDeleted(playlistId: number): void {
    // Cerrar modal después de eliminar
    this.closeConfigModal();
  }
  
  // === RANKING ===
  // Usar el estado centralizado del RankingService
  rankedSongs = this.rankingService.rankedSongs;
  loadingRanking = this.rankingService.loading;
  
  // Evento para reproducir canción desde el ranking
  playSong = output<Song>();
  
  ngOnInit(): void {
    // Cargar ranking al iniciar si la vista está activa
    if (this.activeView() === 'ranking') {
      this.rankingService.loadRanking();
    }
    
    // Suscribirse a cambios en el ranking para recargar automáticamente
    this.rankingChangedSub = this.rankingService.rankingChanged$.subscribe(() => {
      // El estado ya se actualiza en el servicio, no necesitamos hacer nada aquí
    });
  }
  
  ngOnDestroy(): void {
    this.rankingChangedSub?.unsubscribe();
  }
  
  ngOnChanges(): void {
    if (this.activeView() === 'ranking') {
      this.rankingService.loadRanking();
    }
  }
  
  onRankingDrop(event: CdkDragDrop<Song[]>): void {
    // Actualizar visualmente de inmediato (optimistic update)
    const songs = [...this.rankedSongs()];
    moveItemInArray(songs, event.previousIndex, event.currentIndex);
    
    const movedSong = songs[event.currentIndex];
    const newPosition = event.currentIndex + 1;
    
    this.rankingService.moveInRanking(movedSong.id, newPosition).subscribe({
      next: () => {
        this.toastService.success(`"${movedSong.title}" movida a #${newPosition}`);
        // El servicio ya recarga automáticamente
      },
      error: () => {
        this.toastService.error('Error al mover canción');
        this.rankingService.loadRanking(); // Revertir al estado del servidor
      }
    });
  }
  
  removeFromRanking(song: Song, event: Event): void {
    event.stopPropagation();
    this.rankingService.removeFromRanking(song.id).subscribe({
      next: () => {
        this.toastService.success(`"${song.title}" quitada del ranking`);
        // El servicio ya actualiza automáticamente
      },
      error: () => {
        this.toastService.error('Error al quitar del ranking');
      }
    });
  }
  
  onPlayFromRanking(song: Song): void {
    this.playSong.emit(song);
  }
  
  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // === COLA DE REPRODUCCIÓN ===
  
  /**
   * Reproduce una canción de la cola pendiente.
   */
  onPlayFromQueue(queueIndex: number): void {
    this.playerService.playFromQueue(queueIndex);
  }
  
  /**
   * Elimina una canción de la cola.
   */
  onRemoveFromQueue(queueIndex: number, event: Event): void {
    event.stopPropagation();
    const song = this.playerService.queue()[queueIndex];
    this.playerService.removeFromQueue(queueIndex);
    if (song) {
      this.toastService.info(`"${song.title}" quitada de la cola`);
    }
  }
  
  /**
   * Drag & drop para reordenar la cola.
   */
  onQueueDrop(event: CdkDragDrop<any[]>): void {
    const currentIndex = this.playerService.queueIndex();
    // Los índices del drop son relativos a upcomingSongs, 
    // hay que sumar currentIndex + 1 para obtener el índice real
    const fromIndex = currentIndex + 1 + event.previousIndex;
    const toIndex = currentIndex + 1 + event.currentIndex;
    
    this.playerService.moveInQueue(fromIndex, toIndex);
  }
  
  /**
   * Obtiene la URL del cover para una canción.
   * Para videos, genera thumbnail al vuelo y lo cachea.
   */
  getCoverUrl(song: Song): string {
    // Dependencia de la señal para reactividad
    this.thumbnailVersion();
    
    // Verificar si ya tenemos thumbnail cacheado
    const cached = this.thumbnailCache.get(song.id);
    if (cached) {
      return cached;
    }
    
    // Si es video, generar thumbnail asíncronamente
    if (this.isVideoFile(song.filePath)) {
      // Lanzar generación en background
      this.thumbnailService.getThumbnail(song.id, song.filePath).then(thumbnail => {
        if (thumbnail) {
          this.thumbnailCache.set(song.id, thumbnail);
          // Incrementar versión para forzar re-render
          this.thumbnailVersion.update(v => v + 1);
        }
      });
    }
    
    // Mientras tanto, devolver cover por defecto
    return 'img/default-cover.webp';
  }
  
  /**
   * Determina si un archivo es video.
   */
  private isVideoFile(filePath: string): boolean {
    const videoExtensions = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov']);
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.has(ext);
  }
}
