import { Component, input, output, inject, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../toast/toast.component';
import { PlaylistService } from '../../../core/services/playlist.service';
import { LibraryService } from '../../../core/services/library.service';
import { ThumbnailService } from '../../../core/services/thumbnail.service';
import { Song } from '../../../models/song.model';

type ViewMode = 'playlist' | 'library';

@Component({
  selector: 'app-song-selector-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ModalComponent],
  templateUrl: './song-selector-modal.component.html',
  styleUrl: './song-selector-modal.component.scss'
})
export class SongSelectorModalComponent implements OnChanges {
  private readonly toastService = inject(ToastService);
  private readonly playlistService = inject(PlaylistService);
  private readonly libraryService = inject(LibraryService);
  private readonly thumbnailService = inject(ThumbnailService);
  
  // ID de la playlist a gestionar
  playlistId = input<number | null>(null);
  
  // Si el modal está abierto
  isOpen = input<boolean>(false);
  
  // Eventos
  closeModal = output<void>();
  
  // Estado
  allSongs = signal<Song[]>([]);
  playlistSongs = signal<Song[]>([]); // Canciones de la playlist en orden
  loading = signal(false);
  searchQuery = signal('');
  reordering = signal(false);
  activeView = signal<ViewMode>('playlist');
  
  // Thumbnails
  private readonly thumbnailVersion = signal(0);
  private readonly thumbnailCache = new Map<number, string>();
  
  // Computed: playlist actual
  readonly currentPlaylist = computed(() => {
    const id = this.playlistId();
    if (!id) return null;
    return this.playlistService.playlists().find(p => p.id === id) || null;
  });
  
  // Computed: título del modal
  readonly modalTitle = computed(() => {
    const playlist = this.currentPlaylist();
    return playlist ? `Canciones de "${playlist.name}"` : 'Seleccionar canciones';
  });
  
  // Computed: canciones de biblioteca filtradas (excluyendo las que ya están)
  readonly filteredLibrarySongs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const songs = this.allSongs();
    const playlistSongIds = new Set(this.playlistSongs().map(s => s.id));
    
    // Filtrar canciones que NO están en la playlist
    let available = songs.filter(s => !playlistSongIds.has(s.id));
    
    if (query) {
      available = available.filter(song => 
        (song.title || '').toLowerCase().includes(query) ||
        (song.artist || '').toLowerCase().includes(query)
      );
    }
    
    return available;
  });
  
  ngOnChanges(): void {
    if (this.isOpen() && this.playlistId()) {
      this.loadData();
    }
  }
  
  private loadData(): void {
    this.loading.set(true);
    
    // Cargar biblioteca
    this.libraryService.getAllSongs().subscribe({
      next: (songs) => {
        this.allSongs.set(songs);
      },
      error: () => {
        this.toastService.error('Error al cargar canciones');
      }
    });
    
    // Cargar canciones de la playlist (en orden)
    const id = this.playlistId();
    if (id) {
      this.playlistService.getPlaylistSongs(id).subscribe({
        next: (songs) => {
          this.playlistSongs.set(songs);
          this.loading.set(false);
        },
        error: () => {
          this.toastService.error('Error al cargar playlist');
          this.loading.set(false);
        }
      });
    }
  }
  
  onClose(): void {
    this.searchQuery.set('');
    this.closeModal.emit();
  }
  
  // === PANEL IZQUIERDO: Canciones de la playlist ===
  
  onRemoveFromPlaylist(song: Song): void {
    const playlistId = this.playlistId();
    if (!playlistId) return;
    
    this.playlistService.removeSong(playlistId, song.id).subscribe({
      next: () => {
        this.playlistSongs.update(songs => songs.filter(s => s.id !== song.id));
        this.toastService.info(`"${song.title}" quitada`);
      },
      error: () => {
        this.toastService.error('Error al quitar canción');
      }
    });
  }
  
  onPlaylistDrop(event: CdkDragDrop<Song[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    
    const songs = [...this.playlistSongs()];
    moveItemInArray(songs, event.previousIndex, event.currentIndex);
    this.playlistSongs.set(songs);
    
    this.saveOrder(songs);
  }
  
  private saveOrder(songs: Song[]): void {
    const playlistId = this.playlistId();
    if (!playlistId) return;
    
    this.reordering.set(true);
    const songIds = songs.map(s => s.id);
    
    this.playlistService.reorderSongs(playlistId, songIds).subscribe({
      next: () => {
        this.reordering.set(false);
      },
      error: () => {
        this.toastService.error('Error al guardar orden');
        this.reordering.set(false);
        this.loadData();
      }
    });
  }
  
  // === PANEL DERECHO: Biblioteca ===
  
  onAddToPlaylist(song: Song): void {
    const playlistId = this.playlistId();
    if (!playlistId) return;
    
    this.playlistService.addSong(playlistId, song.id).subscribe({
      next: () => {
        this.playlistSongs.update(songs => [...songs, song]);
        this.toastService.success(`"${song.title}" agregada`);
      },
      error: () => {
        this.toastService.error('Error al agregar canción');
      }
    });
  }
  
  // === THUMBNAILS ===
  
  getCoverUrl(song: Song): string {
    this.thumbnailVersion();
    
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
  
  formatDuration(seconds: number): string {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
