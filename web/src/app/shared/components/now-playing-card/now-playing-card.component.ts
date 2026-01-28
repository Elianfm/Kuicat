import { Component, input, signal, output, inject, HostListener, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast/toast.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.component';
import { RankingService } from '../../../core/services/ranking.service';
import { PlayerService } from '../../../core/services/player.service';
import { ThumbnailService } from '../../../core/services/thumbnail.service';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Song } from '../../../models/song.model';
import { Playlist } from '../../../models/playlist.model';

/** Información mínima de canción vecina en ranking */
export interface RankingNeighbor {
  id: number;
  title: string;
  artist: string;
  cover: string;
  rankPosition: number;
}

@Component({
  selector: 'app-now-playing-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './now-playing-card.component.html',
  styleUrl: './now-playing-card.component.scss'
})
export class NowPlayingCardComponent {
  private readonly toastService = inject(ToastService);
  private readonly elementRef = inject(ElementRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly rankingService = inject(RankingService);
  private readonly playerService = inject(PlayerService);
  private readonly thumbnailService = inject(ThumbnailService);
  private readonly playlistService = inject(PlaylistService);
  
  // Señal para forzar re-render cuando se generan thumbnails
  private readonly thumbnailVersion = signal(0);
  private readonly thumbnailCache = new Map<number, string>();
  
  // Song data
  songId = input<number | null>(null);
  title = input('Nombre de la Canción');
  artist = input('Artista');
  cover = input('img/default-cover.webp');
  rankPosition = input<number | null>(null);
  
  // Canciones vecinas en el ranking (para preview al subir/bajar)
  prevSong = input<RankingNeighbor | null>(null);
  nextSong = input<RankingNeighbor | null>(null);
  totalRanked = input<number>(0);
  
  // Computed para usar el valor del servicio centralizado o el input
  get effectiveTotalRanked(): number {
    return this.totalRanked() || this.rankingService.totalRanked();
  }
  
  // Obtener canciones vecinas desde el servicio centralizado
  get prevNeighbor(): Song | null {
    const pos = this.rankPosition();
    return pos ? this.rankingService.getPreviousSong(pos) : null;
  }
  
  get nextNeighbor(): Song | null {
    const pos = this.rankPosition();
    return pos ? this.rankingService.getNextSong(pos) : null;
  }
  
  // Covers de vecinos con thumbnail support
  get prevNeighborCover(): string {
    return this.prevNeighbor ? this.getCoverUrl(this.prevNeighbor) : 'img/default-cover.webp';
  }
  
  get nextNeighborCover(): string {
    return this.nextNeighbor ? this.getCoverUrl(this.nextNeighbor) : 'img/default-cover.webp';
  }
  
  /**
   * Obtiene la URL del cover para una canción con soporte de thumbnails.
   */
  getCoverUrl(song: Song): string {
    this.thumbnailVersion(); // Para reactividad
    
    const cached = this.thumbnailCache.get(song.id);
    if (cached) return cached;
    
    if (this.isVideoFile(song.filePath)) {
      this.thumbnailService.getThumbnail(song.id, song.filePath).then(thumbnail => {
        if (thumbnail) {
          this.thumbnailCache.set(song.id, thumbnail);
          this.thumbnailVersion.update(v => v + 1);
        }
      });
    }
    
    return 'img/default-cover.webp';
  }
  
  private isVideoFile(filePath: string): boolean {
    const videoExtensions = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov']);
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.has(ext);
  }
  
  // Estado del dropdown
  showPlaylistDropdown = signal(false);
  
  // Evento para agregar a playlist
  addToPlaylist = output<number>();
  
  // Evento para quitar de playlist
  removeFromPlaylist = output<number>();
  
  // Evento cuando el ranking cambia (para refresh)
  rankingChanged = output<void>();
  
  // Playlists desde el servicio centralizado
  readonly playlists = this.playlistService.playlists;
  
  // Computed: playlists con info de si contienen la canción actual
  readonly playlistsWithStatus = computed(() => {
    const id = this.songId();
    if (!id) return [];
    return this.playlists().map(p => ({
      ...p,
      hasSong: p.songIds.includes(id)
    }));
  });
  
  constructor() {
    // Cargar el ranking al iniciar para tener los datos centralizados
    this.rankingService.loadRanking();
  }
  
  toggleDropdown(): void {
    this.showPlaylistDropdown.update(v => !v);
  }
  
  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showPlaylistDropdown() && !this.elementRef.nativeElement.contains(event.target)) {
      this.showPlaylistDropdown.set(false);
    }
  }
  
  onTogglePlaylist(playlist: Playlist & { hasSong: boolean }): void {
    const songId = this.songId();
    if (!songId) return;
    
    if (playlist.hasSong) {
      this.playlistService.removeSong(playlist.id, songId).subscribe({
        next: () => {
          this.toastService.info(`Quitada de "${playlist.name}"`);
          this.removeFromPlaylist.emit(playlist.id);
        },
        error: () => this.toastService.error('Error al quitar de playlist')
      });
    } else {
      this.playlistService.addSong(playlist.id, songId).subscribe({
        next: () => {
          this.toastService.success(`Agregada a "${playlist.name}"`);
          this.addToPlaylist.emit(playlist.id);
        },
        error: () => this.toastService.error('Error al agregar a playlist')
      });
    }
  }
  
  /** Añadir al ranking (al final) */
  onAddToRanking(): void {
    const id = this.songId();
    if (!id) return;
    
    this.rankingService.addToRanking(id, 999).subscribe({
      next: () => {
        this.toastService.success('Añadida al ranking');
        this.playerService.refreshVisibleSongs(); // Actualizar actual y siguiente
        this.rankingChanged.emit();
      },
      error: () => this.toastService.error('Error al añadir al ranking')
    });
  }
  
  /** Quitar del ranking (con confirmación) */
  async onRemoveFromRanking(): Promise<void> {
    const id = this.songId();
    if (!id) return;
    
    const confirmed = await this.confirmDialog.confirm({
      title: 'Quitar del ranking',
      message: `¿Seguro que quieres quitar "${this.title()}" del ranking?`,
      confirmText: 'Quitar',
      cancelText: 'Cancelar'
    });
    
    if (confirmed) {
      this.rankingService.removeFromRanking(id).subscribe({
        next: () => {
          this.toastService.success('Quitada del ranking');
          this.playerService.refreshVisibleSongs(); // Actualizar actual y siguiente
          this.rankingChanged.emit();
        },
        error: () => this.toastService.error('Error al quitar del ranking')
      });
    }
  }
  
  /** Subir una posición en el ranking */
  onMoveUp(): void {
    const id = this.songId();
    const pos = this.rankPosition();
    if (!id || !pos || pos <= 1) return;
    
    this.rankingService.moveInRanking(id, pos - 1).subscribe({
      next: () => {
        this.playerService.refreshVisibleSongs(); // Actualizar actual y siguiente
        this.rankingChanged.emit();
      },
      error: () => this.toastService.error('Error al mover en ranking')
    });
  }
  
  /** Bajar una posición en el ranking */
  onMoveDown(): void {
    const id = this.songId();
    const pos = this.rankPosition();
    if (!id || !pos || pos >= this.effectiveTotalRanked) return;
    
    this.rankingService.moveInRanking(id, pos + 1).subscribe({
      next: () => {
        this.playerService.refreshVisibleSongs(); // Actualizar actual y siguiente
        this.rankingChanged.emit();
      },
      error: () => this.toastService.error('Error al mover en ranking')
    });
  }
}
