import { Component, signal, computed, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-bar.component.html',
  styleUrl: './player-bar.component.scss'
})
export class PlayerBarComponent {
  // Eventos
  openSettings = output<void>();
  
  // Estado del reproductor
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(240); // 4 minutos ejemplo
  volume = signal(75);
  
  // Estado de drag del volumen
  private isDraggingVolume = false;
  private volumeTrackElement: HTMLElement | null = null;
  
  // Tiempo formateado
  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));
  progressPercent = computed(() => (this.currentTime() / this.duration()) * 100);
  
  togglePlay(): void {
    this.isPlaying.update(v => !v);
  }
  
  previousTrack(): void {
    console.log('Previous track');
  }
  
  nextTrack(): void {
    console.log('Next track');
  }
  
  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentTime.set(Number(input.value));
  }
  
  setVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.volume.set(Number(input.value));
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
    this.volume.set(Math.round(percent));
  }
  
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  onOpenSettings(): void {
    this.openSettings.emit();
  }
}
