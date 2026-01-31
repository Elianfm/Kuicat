import { Component, model, inject, AfterViewInit, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeftSidebarControlsComponent } from '../../shared/components/left-sidebar-controls/left-sidebar-controls.component';
import { RightSidebarControlsComponent } from '../../shared/components/right-sidebar-controls/right-sidebar-controls.component';
import { PlayerService } from '../../core/services/player.service';
import { ThumbnailService } from '../../core/services/thumbnail.service';

@Component({
  selector: 'app-main-view',
  standalone: true,
  imports: [
    CommonModule,
    LeftSidebarControlsComponent,
    RightSidebarControlsComponent
  ],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss'
})
export class MainViewComponent implements AfterViewInit {
  private readonly playerService = inject(PlayerService);
  private readonly thumbnailService = inject(ThumbnailService);
  
  @ViewChild('mediaPlayer') mediaPlayerRef!: ElementRef<HTMLVideoElement>;
  
  // Estado desde PlayerService
  isVideo = this.playerService.isVideo;
  currentSong = this.playerService.currentSong;
  isPlaying = this.playerService.isPlaying;
  isPlayingRadio = this.playerService.isPlayingRadioAnnouncement;
  
  // Para reactividad de thumbnails
  private readonly thumbnailVersion = signal(0);
  private readonly thumbnailCache = new Map<number, string>();
  
  // Cover de la canción actual (computed con thumbnail dinámico)
  coverUrl = computed(() => {
    // Si está reproduciendo anuncio de radio, mostrar radio cover
    if (this.isPlayingRadio()) {
      return 'img/radio-cover.webp';
    }
    
    const song = this.currentSong();
    if (!song) return 'img/default-cover.webp';
    
    // Dependencia para reactividad
    this.thumbnailVersion();
    
    // Si tenemos thumbnail cacheado, usarlo
    const cached = this.thumbnailCache.get(song.id);
    if (cached) return cached;
    
    // Si es video, generar thumbnail
    if (this.isVideoFile(song.filePath)) {
      this.thumbnailService.getThumbnail(song.id, song.filePath).then(thumbnail => {
        if (thumbnail) {
          this.thumbnailCache.set(song.id, thumbnail);
          this.thumbnailVersion.update(v => v + 1);
        }
      });
    }
    
    return 'img/default-cover.webp';
  });
  
  // Info de la canción actual (para alt text)
  songTitle = computed(() => this.currentSong()?.title || 'Sin título');
  
  // Control de sidebars (two-way binding)
  leftSidebar = model<'lyrics' | 'info' | null>(null);
  rightSidebar = model<'playlist' | 'queue' | 'ranking' | null>(null);
  
  ngAfterViewInit(): void {
    // Inicializar el PlayerService con el elemento de video
    if (this.mediaPlayerRef?.nativeElement) {
      this.playerService.initMediaElement(this.mediaPlayerRef.nativeElement);
    }
  }
  
  /**
   * Alterna play/pause al hacer click en el video o la carátula.
   */
  togglePlay(): void {
    this.playerService.togglePlay();
  }
  
  /**
   * Determina si un archivo es video.
   */
  private isVideoFile(filePath: string): boolean {
    const videoExtensions = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov']);
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.has(ext);
  }
}
