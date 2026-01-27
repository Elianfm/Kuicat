import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast/toast.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.component';
import { RankingService } from '../../../core/services/ranking.service';
import { PlayerService } from '../../../core/services/player.service';
import { Song } from '../../../models/song.model';

/** Información mínima de canción vecina en ranking */
export interface RankingNeighbor {
  id: number;
  title: string;
  artist: string;
  cover: string;
  rankPosition: number;
}

@Component({
  selector: 'app-next-song-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './next-song-card.component.html',
  styleUrl: './next-song-card.component.scss'
})
export class NextSongCardComponent {
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly rankingService = inject(RankingService);
  private readonly playerService = inject(PlayerService);
  
  // Song data
  songId = input<number | null>(null);
  title = input('Siguiente Canción');
  artist = input('Artista');
  cover = input('img/default-cover.webp');
  rankPosition = input<number | null>(null);
  
  // Canciones vecinas en el ranking
  prevSong = input<RankingNeighbor | null>(null);
  nextSong = input<RankingNeighbor | null>(null);
  totalRanked = input<number>(0);
  
  // Evento cuando el ranking cambia
  rankingChanged = output<void>();
  
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
  
  constructor() {
    // Cargar el ranking al iniciar para tener los datos centralizados
    this.rankingService.loadRanking();
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
