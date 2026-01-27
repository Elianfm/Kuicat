import { Component, output, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../core/services/player.service';

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
}
