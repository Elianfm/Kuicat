import { Component, signal, computed, output } from '@angular/core';
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
  
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  onOpenSettings(): void {
    this.openSettings.emit();
  }
}
