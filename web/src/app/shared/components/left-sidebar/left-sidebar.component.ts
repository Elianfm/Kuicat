import { Component, input, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast/toast.component';

interface SongInfo {
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
  
  activeView = input<'lyrics' | 'info' | null>(null);
  
  // Evento para emitir cambios en la info de la canción
  songInfoChange = output<Partial<SongInfo>>();
  
  // Evento para emitir cambios en las lyrics
  lyricsChange = output<string>();
  
  // Lyrics de la canción (mock - en producción vendría del padre)
  lyrics = signal<string>('');
  
  // Estado de edición de lyrics
  editingLyrics = signal<boolean>(false);
  lyricsEditValue = '';
  
  // Info de la canción actual (mock - en producción vendría del padre)
  songInfo = signal<SongInfo>({
    title: 'Nombre de la Canción',
    artist: 'Artista',
    album: 'Álbum',
    year: 2024,
    genre: 'Rock',
    duration: '4:15',
    rating: 7,
    lastPlayed: new Date('2026-01-24T18:30:00'),
    playCount: 47,
    description: '',
    notes: ''
  });
  
  // Campo actualmente en edición
  editingField = signal<keyof SongInfo | null>(null);
  
  // Valor temporal durante edición
  editValue = '';
  
  // Hover sobre rating
  hoverRating = signal<number>(0);
  
  // Iniciar edición de un campo
  startEditing(field: keyof SongInfo): void {
    // Campos no editables
    if (field === 'duration' || field === 'rating' || field === 'lastPlayed' || field === 'playCount') return;
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
    if (this.editValue.trim() && this.editValue !== this.songInfo()[field]) {
      this.songInfo.update(info => ({
        ...info,
        [field]: this.editValue.trim()
      }));
      this.toastService.success(`${this.getFieldLabel(field)} actualizado`);
      this.songInfoChange.emit({ [field]: this.editValue.trim() });
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
    this.songInfo.update(info => ({ ...info, rating }));
    this.toastService.success(`Puntuación: ${rating}/10`);
    this.songInfoChange.emit({ rating });
  }
  
  // Obtener label del campo
  getFieldLabel(field: keyof SongInfo): string {
    const labels: Record<keyof SongInfo, string> = {
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
      notes: 'Notas'
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
    const newLyrics = this.lyricsEditValue.trim();
    if (newLyrics !== this.lyrics()) {
      this.lyrics.set(newLyrics);
      this.toastService.success('Letra guardada');
      this.lyricsChange.emit(newLyrics);
    }
    this.editingLyrics.set(false);
  }
  
  // Cancelar edición de lyrics
  cancelLyricsEditing(): void {
    this.editingLyrics.set(false);
    this.lyricsEditValue = this.lyrics();
  }
}
