import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PlayerBarComponent } from './features/player/player-bar.component';
import { LeftSidebarComponent } from './shared/components/left-sidebar/left-sidebar.component';
import { RightSidebarComponent } from './shared/components/right-sidebar/right-sidebar.component';
import { MainViewComponent } from './features/library/main-view.component';
import { NowPlayingCardComponent } from './shared/components/now-playing-card/now-playing-card.component';
import { NextSongCardComponent } from './shared/components/next-song-card/next-song-card.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfigModalComponent, AppConfig } from './shared/components/config-modal/config-modal.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { PlayerService } from './core/services/player.service';
import { Song } from './models/song.model';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    PlayerBarComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    MainViewComponent,
    NowPlayingCardComponent,
    NextSongCardComponent,
    ToastComponent,
    ConfigModalComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly playerService = inject(PlayerService);
  
  // Estado de sidebars (controlado desde main-view)
  leftSidebar = signal<'lyrics' | 'info' | null>(null);
  rightSidebar = signal<'playlist' | 'queue' | 'ranking' | null>(null);
  
  // Desde PlayerService
  currentSong = this.playerService.currentSong;
  nextSong = this.playerService.nextSong;
  isVideo = this.playerService.isVideo;
  
  // Estado del modal de configuración
  configModalOpen = signal(false);
  
  // Configuración de la app
  appConfig = signal<AppConfig>({
    videosPath: ''
  });
  
  ngOnInit(): void {
    // Cargar configuración de localStorage
    const savedConfig = localStorage.getItem('kuicat-config');
    if (savedConfig) {
      this.appConfig.set(JSON.parse(savedConfig));
    }
    
    // Cargar biblioteca al inicio
    this.loadLibrary();
  }
  
  /**
   * Carga la biblioteca de canciones del backend.
   */
  private loadLibrary(): void {
    this.http.get<PageResponse<Song>>('http://localhost:8741/api/songs?size=1000')
      .subscribe({
        next: (response) => {
          if (response.content.length > 0) {
            // Cargar todas las canciones en la queue
            this.playerService.loadQueue(response.content, 0);
          }
        },
        error: (err) => {
          console.log('No hay canciones en la biblioteca o backend no disponible');
        }
      });
  }
  
  // Abrir modal de configuración
  openConfigModal(): void {
    this.configModalOpen.set(true);
  }
  
  // Cerrar modal de configuración
  closeConfigModal(): void {
    this.configModalOpen.set(false);
  }
  
  // Guardar configuración
  onConfigChange(config: AppConfig): void {
    this.appConfig.set(config);
    localStorage.setItem('kuicat-config', JSON.stringify(config));
    // Recargar biblioteca después de cambiar configuración
    this.loadLibrary();
  }
}
