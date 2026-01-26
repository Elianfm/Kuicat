import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerBarComponent } from './features/player/player-bar.component';
import { LeftSidebarComponent } from './shared/components/left-sidebar/left-sidebar.component';
import { RightSidebarComponent } from './shared/components/right-sidebar/right-sidebar.component';
import { MainViewComponent } from './features/library/main-view.component';
import { NowPlayingCardComponent } from './shared/components/now-playing-card/now-playing-card.component';
import { NextSongCardComponent } from './shared/components/next-song-card/next-song-card.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfigModalComponent, AppConfig } from './shared/components/config-modal/config-modal.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

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
export class App {
  // Estado de sidebars (controlado desde main-view)
  leftSidebar = signal<'lyrics' | 'info' | null>(null);
  rightSidebar = signal<'playlist' | 'queue' | 'ranking' | null>(null);
  
  // Info de la canción actual (mock)
  currentSong = signal({
    title: 'Nombre de la Canción',
    artist: 'Artista',
    cover: 'img/default-cover.webp',
    hasVideo: false
  });
  
  // Info de la siguiente canción (mock)
  nextSong = signal({
    title: 'Siguiente Canción',
    artist: 'Otro Artista',
    cover: 'img/default-cover.webp'
  });
  
  // Estado del modal de configuración
  configModalOpen = signal(false);
  
  // Configuración de la app
  appConfig = signal<AppConfig>({
    videosPath: ''
  });
  
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
    // TODO: Persistir en localStorage o backend
    console.log('Config saved:', config);
  }
}
