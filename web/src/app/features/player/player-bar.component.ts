import { Component, output, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../core/services/player.service';
import { PlayMode } from '../../models/player-state.model';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-bar.component.html',
  styleUrl: './player-bar.component.scss'
})
export class PlayerBarComponent {
  private readonly playerService = inject(PlayerService);
  
  // Eventos
  openSettings = output<void>();
  
  // Estado del reproductor - conectado al PlayerService
  isPlaying = this.playerService.isPlaying;
  currentTime = this.playerService.currentTime;
  duration = this.playerService.duration;
  volume = this.playerService.volume;
  isLoading = this.playerService.isLoading;
  playMode = this.playerService.playMode;
  isReversed = this.playerService.isReversed;
  
  // Estado del menú de modo de reproducción
  showPlayModeMenu = signal(false);
  
  // Estado de drag del volumen
  private isDraggingVolume = false;
  private volumeTrackElement: HTMLElement | null = null;
  
  // Tiempo formateado - desde el servicio
  formattedCurrentTime = this.playerService.formattedCurrentTime;
  formattedDuration = this.playerService.formattedDuration;
  progressPercent = this.playerService.progressPercent;
  
  togglePlay(): void {
    this.playerService.togglePlay();
  }
  
  previousTrack(): void {
    this.playerService.previous();
  }
  
  nextTrack(): void {
    this.playerService.next();
  }
  
  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.playerService.seek(Number(input.value));
  }
  
  setVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.playerService.setVolume(Number(input.value));
  }
  
  /** Iniciar drag en el track de volumen */
  onVolumeTrackMouseDown(event: MouseEvent): void {
    this.isDraggingVolume = true;
    this.volumeTrackElement = event.currentTarget as HTMLElement;
    this.updateVolumeFromMouseEvent(event);
    event.preventDefault();
  }
  
  /** Mouse move global para drag */
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (this.isDraggingVolume && this.volumeTrackElement) {
      this.updateVolumeFromMouseEvent(event);
    }
  }
  
  /** Mouse up global para terminar drag */
  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.isDraggingVolume = false;
    this.volumeTrackElement = null;
  }
  
  /** Click global para cerrar menús */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Cerrar menú de modo si se hace clic fuera
    const target = event.target as HTMLElement;
    if (!target.closest('.play-mode-control')) {
      this.showPlayModeMenu.set(false);
    }
  }
  
  private updateVolumeFromMouseEvent(event: MouseEvent): void {
    if (!this.volumeTrackElement) return;
    const rect = this.volumeTrackElement.getBoundingClientRect();
    const clickY = rect.bottom - event.clientY;
    const percent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));
    this.playerService.setVolume(Math.round(percent));
  }
  
  onOpenSettings(): void {
    this.openSettings.emit();
  }
  
  // ========== Play Mode Methods ==========
  
  togglePlayModeMenu(event: Event): void {
    event.stopPropagation();
    this.showPlayModeMenu.update(v => !v);
  }
  
  selectPlayMode(mode: PlayMode): void {
    this.playerService.setPlayMode(mode);
    this.showPlayModeMenu.set(false);
  }
  
  toggleReverse(event: Event): void {
    event.stopPropagation();
    this.playerService.toggleReverse();
  }
  
  getPlayModeIcon(): string {
    const mode = this.playMode();
    switch (mode) {
      case 'shuffle': return 'shuffle';
      case 'by-ranking': 
      case 'top-50':
      case 'top-100':
      case 'top-200':
      case 'top-300':
      case 'top-400':
      case 'top-500':
        return 'emoji_events';
      case 'unranked': return 'explore';
      case 'by-artist': return 'person';
      case 'by-genre': return 'category';
      case 'ai-suggested': return 'psychology';
      default: return 'repeat';
    }
  }
  
  getPlayModeLabel(): string {
    const mode = this.playMode();
    switch (mode) {
      case 'shuffle': return 'Aleatorio';
      case 'by-ranking': return 'Solo Ranking';
      case 'top-50': return 'Top 50';
      case 'top-100': return 'Top 100';
      case 'top-200': return 'Top 200';
      case 'top-300': return 'Top 300';
      case 'top-400': return 'Top 400';
      case 'top-500': return 'Top 500';
      case 'unranked': return 'No rankeadas';
      case 'by-artist': return 'Por Artista';
      case 'by-genre': return 'Por Género';
      case 'ai-suggested': return 'IA Sugerido';
      default: return 'En orden';
    }
  }
}
