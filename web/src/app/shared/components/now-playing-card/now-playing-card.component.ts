import { Component, input, signal, output, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast/toast.component';

interface Playlist {
  id: number;
  name: string;
  icon: string;
  hasSong: boolean;
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
  
  title = input('Nombre de la Canción');
  artist = input('Artista');
  cover = input('img/default-cover.webp');
  
  // Estado del dropdown
  showPlaylistDropdown = signal(false);
  
  // Evento para agregar a playlist
  addToPlaylist = output<number>();
  
  // Evento para quitar de playlist
  removeFromPlaylist = output<number>();
  
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
      // Quitar de la playlist
      this.playlists.update(playlists =>
        playlists.map(p => p.id === playlist.id ? { ...p, hasSong: false } : p)
      );
      this.toastService.info(`Quitada de "${playlist.name}"`);
      this.removeFromPlaylist.emit(playlist.id);
    } else {
      // Agregar a la playlist
      this.playlists.update(playlists =>
        playlists.map(p => p.id === playlist.id ? { ...p, hasSong: true } : p)
      );
      this.toastService.success(`Agregada a "${playlist.name}"`);
      this.addToPlaylist.emit(playlist.id);
    }
  }
}
