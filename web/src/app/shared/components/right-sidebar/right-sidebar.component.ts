import { Component, input, output, signal, inject, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { ToastService } from '../toast/toast.component';
import { RankingService } from '../../../core/services/ranking.service';
import { Song } from '../../../models';

interface Playlist {
  id: number;
  name: string;
  icon: string;
  songCount: number;
  songIds: number[];
}

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './right-sidebar.component.html',
  styleUrl: './right-sidebar.component.scss'
})
export class RightSidebarComponent implements OnInit, OnDestroy, OnChanges {
  private readonly toastService = inject(ToastService);
  private readonly rankingService = inject(RankingService);
  private rankingChangedSub?: Subscription;
  
  activeView = input<'playlist' | 'queue' | 'ranking' | null>(null);
  currentSongId = input<number>(1); // ID de la canción actual
  
  // Evento para agregar canción actual a una playlist
  addToPlaylist = output<number>();
  
  // Evento para quitar canción actual de una playlist
  removeFromPlaylist = output<number>();
  
  // Evento para reproducir una playlist
  playPlaylist = output<number>();
  
  // Mock data - Lista de playlists con IDs de canciones que contienen (usando signal para reactividad)
  playlists = signal<Playlist[]>([
    { id: 1, name: 'Favoritas', icon: 'favorite', songCount: 42, songIds: [1, 3, 5] },
    { id: 2, name: 'Para trabajar', icon: 'work', songCount: 28, songIds: [2, 4] },
    { id: 3, name: 'Chill', icon: 'spa', songCount: 15, songIds: [1, 2] },
    { id: 4, name: 'Workout', icon: 'fitness_center', songCount: 33, songIds: [3, 4, 5] },
    { id: 5, name: 'Road Trip', icon: 'directions_car', songCount: 56, songIds: [1, 5] },
  ]);
  
  // Cola de reproducción
  queue = [
    { id: 2, title: 'Siguiente Canción', artist: 'Artista B', duration: '4:12' },
    { id: 3, title: 'Después de esa', artist: 'Artista A', duration: '3:30' },
  ];
  
  // Verifica si la canción actual está en una playlist
  isInPlaylist(playlistId: number): boolean {
    const playlist = this.playlists().find(p => p.id === playlistId);
    return playlist?.songIds.includes(this.currentSongId()) ?? false;
  }
  
  onAddToPlaylist(playlistId: number): void {
    const playlist = this.playlists().find(p => p.id === playlistId);
    
    // Actualizar el estado local
    this.playlists.update(playlists => 
      playlists.map(p => {
        if (p.id === playlistId && !p.songIds.includes(this.currentSongId())) {
          return {
            ...p,
            songIds: [...p.songIds, this.currentSongId()],
            songCount: p.songCount + 1
          };
        }
        return p;
      })
    );
    
    // Mostrar notificación
    if (playlist) {
      this.toastService.success(`Agregada a "${playlist.name}"`);
    }
    
    // Emitir evento para el componente padre
    this.addToPlaylist.emit(playlistId);
  }
  
  onRemoveFromPlaylist(playlistId: number): void {
    const playlist = this.playlists().find(p => p.id === playlistId);
    
    // Actualizar el estado local
    this.playlists.update(playlists => 
      playlists.map(p => {
        if (p.id === playlistId && p.songIds.includes(this.currentSongId())) {
          return {
            ...p,
            songIds: p.songIds.filter(id => id !== this.currentSongId()),
            songCount: p.songCount - 1
          };
        }
        return p;
      })
    );
    
    // Mostrar notificación
    if (playlist) {
      this.toastService.info(`Quitada de "${playlist.name}"`);
    }
    
    // Emitir evento para el componente padre
    this.removeFromPlaylist.emit(playlistId);
  }
  
  onPlayPlaylist(playlistId: number): void {
    this.playPlaylist.emit(playlistId);
  }
  
  // === RANKING ===
  // Usar el estado centralizado del RankingService
  rankedSongs = this.rankingService.rankedSongs;
  loadingRanking = this.rankingService.loading;
  
  // Evento para reproducir canción desde el ranking
  playSong = output<Song>();
  
  ngOnInit(): void {
    // Cargar ranking al iniciar si la vista está activa
    if (this.activeView() === 'ranking') {
      this.rankingService.loadRanking();
    }
    
    // Suscribirse a cambios en el ranking para recargar automáticamente
    this.rankingChangedSub = this.rankingService.rankingChanged$.subscribe(() => {
      // El estado ya se actualiza en el servicio, no necesitamos hacer nada aquí
    });
  }
  
  ngOnDestroy(): void {
    this.rankingChangedSub?.unsubscribe();
  }
  
  ngOnChanges(): void {
    if (this.activeView() === 'ranking') {
      this.rankingService.loadRanking();
    }
  }
  
  onRankingDrop(event: CdkDragDrop<Song[]>): void {
    // Actualizar visualmente de inmediato (optimistic update)
    const songs = [...this.rankedSongs()];
    moveItemInArray(songs, event.previousIndex, event.currentIndex);
    
    const movedSong = songs[event.currentIndex];
    const newPosition = event.currentIndex + 1;
    
    this.rankingService.moveInRanking(movedSong.id, newPosition).subscribe({
      next: () => {
        this.toastService.success(`"${movedSong.title}" movida a #${newPosition}`);
        // El servicio ya recarga automáticamente
      },
      error: () => {
        this.toastService.error('Error al mover canción');
        this.rankingService.loadRanking(); // Revertir al estado del servidor
      }
    });
  }
  
  removeFromRanking(song: Song, event: Event): void {
    event.stopPropagation();
    this.rankingService.removeFromRanking(song.id).subscribe({
      next: () => {
        this.toastService.success(`"${song.title}" quitada del ranking`);
        // El servicio ya actualiza automáticamente
      },
      error: () => {
        this.toastService.error('Error al quitar del ranking');
      }
    });
  }
  
  onPlayFromRanking(song: Song): void {
    this.playSong.emit(song);
  }
  
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
