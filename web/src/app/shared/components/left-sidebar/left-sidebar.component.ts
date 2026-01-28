import { Component, input, signal, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../toast/toast.component';
import { PlayerService } from '../../../core/services/player.service';
import { Song } from '../../../models/song.model';

interface SongInfo {
  id: number | null;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  genre: string;
  duration: string;
  rating: number;
  // Campos automáticos (no editables)
  lastPlayed: Date | null;
  playCount: number;
  // Campos editables
  description: string;
  notes: string;
  lyrics: string;
}

@Component({
  selector: 'app-left-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './left-sidebar.component.html',
  styleUrl: './left-sidebar.component.scss'
})
export class LeftSidebarComponent {
  private readonly toastService = inject(ToastService);
  private readonly playerService = inject(PlayerService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8741/api/songs';
  
  activeView = input<'lyrics' | 'info' | null>(null);
  
  // Evento para emitir cambios en la info de la canción
  songInfoChange = output<Partial<SongInfo>>();
  
  // Evento para emitir cambios en las lyrics
  lyricsChange = output<string>();
  
  // Lyrics de la canción
  lyrics = signal<string>('');
  
  // Estado de edición de lyrics
  editingLyrics = signal<boolean>(false);
  lyricsEditValue = '';
  
  // Info de la canción actual
  songInfo = signal<SongInfo>({
    id: null,
    title: 'Sin canción',
    artist: 'Artista desconocido',
    album: '',
    year: null,
    genre: '',
    duration: '0:00',
    rating: 0,
    lastPlayed: null,
    playCount: 0,
    description: '',
    notes: '',
    lyrics: ''
  });
  
  // Campo actualmente en edición
  editingField = signal<keyof SongInfo | null>(null);
  
  // Valor temporal durante edición
  editValue = '';
  
  // Hover sobre rating
  hoverRating = signal<number>(0);
  
  constructor() {
    // Efecto que actualiza la info cuando cambia la canción actual
    effect(() => {
      const currentSong = this.playerService.currentSong();
      if (currentSong) {
        this.updateSongInfo(currentSong);
      } else {
        this.resetSongInfo();
      }
    });
    
    // Efecto separado para actualizar la duración cuando esté disponible
    effect(() => {
      const duration = this.playerService.duration();
      if (duration > 0) {
        // Actualizar solo el campo duration sin resetear todo
        this.songInfo.update(info => ({
          ...info,
          duration: this.formatDuration(duration)
        }));
      }
    });
  }
  
  private updateSongInfo(song: Song): void {
    this.songInfo.set({
      id: song.id,
      title: song.title || 'Sin título',
      artist: song.artist || 'Artista desconocido',
      album: song.album || '',
      year: song.year,
      genre: song.genre || '',
      duration: this.formatDuration(song.duration),
      rating: song.rating || 0,
      lastPlayed: song.lastPlayed ? new Date(song.lastPlayed) : null,
      playCount: song.playCount || 0,
      description: song.description || '',
      notes: song.notes || '',
      lyrics: song.lyrics || ''
    });
    this.lyrics.set(song.lyrics || '');
  }
  
  private resetSongInfo(): void {
    this.songInfo.set({
      id: null,
      title: 'Sin canción',
      artist: 'Artista desconocido',
      album: '',
      year: null,
      genre: '',
      duration: '0:00',
      rating: 0,
      lastPlayed: null,
      playCount: 0,
      description: '',
      notes: '',
      lyrics: ''
    });
    this.lyrics.set('');
  }
  
  private formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Iniciar edición de un campo
  startEditing(field: keyof SongInfo): void {
    // Campos no editables
    if (field === 'id' || field === 'duration' || field === 'rating' || field === 'lastPlayed' || field === 'playCount' || field === 'lyrics') return;
    this.editingField.set(field);
    const value = this.songInfo()[field];
    this.editValue = value !== null && value !== undefined ? String(value) : '';
  }

  // Formatear fecha de última reproducción
  formatLastPlayed(date: Date | null): string {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Hace menos de 1 hora';
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  // Guardar cambios
  saveField(field: keyof SongInfo): void {
    const songId = this.songInfo().id;
    if (!songId) {
      this.editingField.set(null);
      return;
    }
    
    const newValue = field === 'year' ? Number(this.editValue) : this.editValue.trim();
    
    if (newValue !== this.songInfo()[field]) {
      // Actualizar localmente en el sidebar
      this.songInfo.update(info => ({
        ...info,
        [field]: newValue
      }));
      
      // Enviar a la API
      this.http.patch(`${this.apiUrl}/${songId}`, { [field]: newValue })
        .subscribe({
          next: () => {
            this.toastService.success(`${this.getFieldLabel(field)} actualizado`);
            // Actualizar también en el PlayerService para que persista en la cola
            this.playerService.updateCurrentSong({ [field]: newValue } as Partial<Song>);
            this.songInfoChange.emit({ [field]: newValue } as Partial<SongInfo>);
          },
          error: (err) => {
            this.toastService.error('Error al guardar');
            console.error('Error updating song:', err);
          }
        });
    }
    this.editingField.set(null);
  }
  
  // Cancelar edición
  cancelEditing(): void {
    this.editingField.set(null);
  }
  
  // Manejar teclas en input
  onKeydown(event: KeyboardEvent, field: keyof SongInfo): void {
    if (event.key === 'Enter') {
      this.saveField(field);
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }
  
  // Actualizar puntuación
  setRating(rating: number): void {
    const songId = this.songInfo().id;
    if (!songId) return;
    
    this.songInfo.update(info => ({ ...info, rating }));
    
    // Enviar a la API
    this.http.patch(`${this.apiUrl}/${songId}`, { rating })
      .subscribe({
        next: () => {
          this.toastService.success(`Puntuación: ${rating}/10`);
          // Actualizar también en el PlayerService
          this.playerService.updateCurrentSong({ rating });
          this.songInfoChange.emit({ rating });
        },
        error: (err) => {
          this.toastService.error('Error al guardar puntuación');
          console.error('Error updating rating:', err);
        }
      });
  }
  
  // Obtener label del campo
  getFieldLabel(field: keyof SongInfo): string {
    const labels: Record<keyof SongInfo, string> = {
      id: 'ID',
      title: 'Título',
      artist: 'Artista',
      album: 'Álbum',
      year: 'Año',
      genre: 'Género',
      duration: 'Duración',
      rating: 'Puntuación',
      lastPlayed: 'Última reproducción',
      playCount: 'Reproducciones',
      description: 'Descripción',
      notes: 'Notas',
      lyrics: 'Letra'
    };
    return labels[field];
  }
  
  // === LYRICS ===
  
  // Iniciar edición de lyrics
  startEditingLyrics(): void {
    this.editingLyrics.set(true);
    this.lyricsEditValue = this.lyrics();
  }
  
  // Guardar lyrics
  saveLyrics(): void {
    const songId = this.songInfo().id;
    if (!songId) {
      this.editingLyrics.set(false);
      return;
    }
    
    const newLyrics = this.lyricsEditValue.trim();
    if (newLyrics !== this.lyrics()) {
      this.lyrics.set(newLyrics);
      
      // Enviar a la API
      this.http.patch(`${this.apiUrl}/${songId}`, { lyrics: newLyrics })
        .subscribe({
          next: () => {
            this.toastService.success('Letra guardada');
            // Actualizar también en el PlayerService
            this.playerService.updateCurrentSong({ lyrics: newLyrics });
            this.lyricsChange.emit(newLyrics);
          },
          error: (err) => {
            this.toastService.error('Error al guardar letra');
            console.error('Error updating lyrics:', err);
          }
        });
    }
    this.editingLyrics.set(false);
  }
  
  // Cancelar edición de lyrics
  cancelLyricsEditing(): void {
    this.editingLyrics.set(false);
    this.lyricsEditValue = this.lyrics();
  }
}
