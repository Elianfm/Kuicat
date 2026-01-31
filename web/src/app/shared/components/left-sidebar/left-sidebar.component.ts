import { Component, input, signal, output, inject, effect, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../toast/toast.component';
import { PlayerService } from '../../../core/services/player.service';
import { RankingService } from '../../../core/services/ranking.service';
import { LibraryService } from '../../../core/services/library.service';
import { Song } from '../../../models/song.model';

interface SongInfo {
  id: number | null;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  genre: string;
  duration: string;
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
export class LeftSidebarComponent implements OnInit {
  private readonly toastService = inject(ToastService);
  private readonly playerService = inject(PlayerService);
  private readonly http = inject(HttpClient);
  private readonly rankingService = inject(RankingService);
  private readonly libraryService = inject(LibraryService);
  private readonly apiUrl = 'http://localhost:8741/api/songs';
  
  // Todas las canciones de la biblioteca (para calcular stats)
  private readonly allSongs = signal<Song[]>([]);
  
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
  
  // Estado de auto-fill
  autoFillLoading = signal<boolean>(false);
  
  // Info de la canción actual
  songInfo = signal<SongInfo>({
    id: null,
    title: 'Sin canción',
    artist: 'Artista desconocido',
    album: '',
    year: null,
    genre: '',
    duration: '0:00',
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
  
  // Señales computed para ranking
  readonly rankPosition = computed(() => {
    const song = this.playerService.currentSong();
    if (!song) return null;
    const songs = this.rankingService.rankedSongs();
    const index = songs.findIndex(s => s.id === song.id);
    return index >= 0 ? index + 1 : null;
  });
  
  readonly totalRanked = computed(() => this.rankingService.rankedSongs().length);
  
  // === STATS COMPUTADAS ===
  
  // Tiempo total escuchado = playCount × duration
  readonly totalListenTime = computed(() => {
    const info = this.songInfo();
    const currentSong = this.playerService.currentSong();
    if (!currentSong) return null;
    
    const totalSeconds = info.playCount * currentSong.duration;
    return this.formatTotalTime(totalSeconds);
  });
  
  // Posición por reproducciones (comparado con toda la biblioteca)
  readonly playCountPosition = computed(() => {
    const currentSong = this.playerService.currentSong();
    const songs = this.allSongs();
    if (!currentSong || songs.length === 0) return null;
    
    // Ordenar por playCount descendente
    const sorted = [...songs].sort((a, b) => b.playCount - a.playCount);
    const position = sorted.findIndex(s => s.id === currentSong.id) + 1;
    return position > 0 ? { position, total: songs.length } : null;
  });
  
  // Frecuencia de escucha = playCount / días desde que se añadió
  readonly listenFrequency = computed(() => {
    const info = this.songInfo();
    const currentSong = this.playerService.currentSong();
    if (!currentSong?.createdAt) return null;
    
    const createdDate = new Date(currentSong.createdAt);
    const now = new Date();
    const daysSinceAdded = Math.max(1, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    const playCount = info.playCount;
    
    // Calcular frecuencia de escucha y generar texto descriptivo
    if (playCount === 0) {
      return { text: 'Sin reproducciones' };
    }
    
    const playsPerDay = playCount / daysSinceAdded;
    
    if (playsPerDay >= 1) {
      // 1 o más veces por día
      const rounded = Math.round(playsPerDay * 10) / 10;
      const veces = rounded === 1 ? 'vez' : 'veces';
      return { text: `~${rounded} ${veces}/día` };
    } else if (playsPerDay >= 1/7) {
      // Entre 1/día y 1/semana -> mostrar por semana
      const playsPerWeek = playsPerDay * 7;
      const rounded = Math.round(playsPerWeek * 10) / 10;
      const veces = rounded === 1 ? 'vez' : 'veces';
      return { text: `~${rounded} ${veces}/semana` };
    } else {
      // Menos de 1/semana -> mostrar cada cuántos días
      const daysPerPlay = Math.round(daysSinceAdded / playCount);
      return { text: `1 vez cada ~${daysPerPlay} días` };
    }
  });
  
  // Helper para formatear el tiempo total
  private formatTotalTime(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds <= 0) return '0 min';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours === 0) {
      return `${minutes} min`;
    } else if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }
  
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
  
  ngOnInit(): void {
    // Cargar todas las canciones para calcular stats
    this.loadAllSongs();
  }
  
  private loadAllSongs(): void {
    this.libraryService.getAllSongs().subscribe({
      next: (songs) => this.allSongs.set(songs),
      error: (err) => console.error('Error loading songs for stats:', err)
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
    if (field === 'id' || field === 'duration' || field === 'lastPlayed' || field === 'playCount' || field === 'lyrics') return;
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
  
  // Añadir canción al ranking
  addToRanking(): void {
    const currentSong = this.playerService.currentSong();
    if (!currentSong) return;
    
    // Añadir al final del ranking (posición = total + 1)
    const position = this.totalRanked() + 1;
    this.rankingService.addToRanking(currentSong.id, position).subscribe({
      next: () => {
        this.toastService.success('Canción añadida al ranking');
      },
      error: (err) => {
        console.error('Error adding to ranking:', err);
        this.toastService.error('Error al añadir al ranking');
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
  
  // === AUTO-FILL CON IA ===
  
  /**
   * Usa IA (OpenAI) para auto-completar la metadata de la canción.
   * Analiza el título/nombre de archivo y sugiere: título, artista, álbum, género, año, descripción.
   */
  autoFillWithAI(): void {
    const songId = this.songInfo().id;
    if (!songId) {
      this.toastService.error('No hay canción seleccionada');
      return;
    }
    
    this.autoFillLoading.set(true);
    
    // Llamar al endpoint que obtiene y aplica la metadata de IA
    this.http.post<Song>(`${this.apiUrl}/${songId}/auto-fill-apply`, {}, { observe: 'response' })
      .subscribe({
        next: (response) => {
          this.autoFillLoading.set(false);
          
          if (response.status === 204 || !response.body) {
            this.toastService.warning('Configura tu API key de OpenAI en Ajustes');
            return;
          }
          
          const updatedSong = response.body;
          
          // Actualizar la info local
          this.updateSongInfo(updatedSong);
          
          // Actualizar en el PlayerService
          this.playerService.updateCurrentSong(updatedSong);
          
          this.toastService.success('Metadata actualizada con IA ✨');
        },
        error: (err) => {
          this.autoFillLoading.set(false);
          console.error('Error auto-fill:', err);
          this.toastService.error('Error al obtener metadata de IA');
        }
      });
  }
}
