import { Component, input, signal, output, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast/toast.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.component';
import { RankingService } from '../../../core/services/ranking.service';

interface Playlist {
  id: number;
  name: string;
  icon: string;
  hasSong: boolean;
}

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
  
  // Estado del dropdown
  showPlaylistDropdown = signal(false);
  
  // Evento para agregar a playlist
  addToPlaylist = output<number>();
  
  // Evento para quitar de playlist
  removeFromPlaylist = output<number>();
  
  // Evento cuando el ranking cambia (para refresh)
  rankingChanged = output<void>();
  
  // Mock playlists con estado de si la canción está en ellas
  playlists = signal<Playlist[]>([
    { id: 1, name: 'Favoritas', icon: 'favorite', hasSong: true },
    { id: 2, name: 'Para trabajar', icon: 'work', hasSong: false },
    { id: 3, name: 'Chill', icon: 'spa', hasSong: true },
    { id: 4, name: 'Workout', icon: 'fitness_center', hasSong: false },
    { id: 5, name: 'Road Trip', icon: 'directions_car', hasSong: true },
  ]);
  
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
  
  onTogglePlaylist(playlist: Playlist): void {
    if (playlist.hasSong) {
      this.playlists.update(playlists =>
        playlists.map(p => p.id === playlist.id ? { ...p, hasSong: false } : p)
      );
      this.toastService.info(`Quitada de "${playlist.name}"`);
      this.removeFromPlaylist.emit(playlist.id);
    } else {
      this.playlists.update(playlists =>
        playlists.map(p => p.id === playlist.id ? { ...p, hasSong: true } : p)
      );
      this.toastService.success(`Agregada a "${playlist.name}"`);
      this.addToPlaylist.emit(playlist.id);
    }
  }
  
  /** Añadir al ranking (al final) */
  onAddToRanking(): void {
    const id = this.songId();
    if (!id) return;
    
    this.rankingService.addToRanking(id, 999).subscribe({
      next: () => {
        this.toastService.success('Añadida al ranking');
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
        this.rankingChanged.emit();
      },
      error: () => this.toastService.error('Error al mover en ranking')
    });
  }
  
  /** Bajar una posición en el ranking */
  onMoveDown(): void {
    const id = this.songId();
    const pos = this.rankPosition();
    if (!id || !pos || pos >= this.totalRanked()) return;
    
    this.rankingService.moveInRanking(id, pos + 1).subscribe({
      next: () => {
        this.rankingChanged.emit();
      },
      error: () => this.toastService.error('Error al mover en ranking')
    });
  }
}
