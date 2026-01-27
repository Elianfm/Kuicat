import { Component, input, model, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeftSidebarControlsComponent } from '../../shared/components/left-sidebar-controls/left-sidebar-controls.component';
import { RightSidebarControlsComponent } from '../../shared/components/right-sidebar-controls/right-sidebar-controls.component';
import { PlayerService } from '../../core/services/player.service';

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
  
  @ViewChild('mediaPlayer') mediaPlayerRef!: ElementRef<HTMLVideoElement>;
  
  // Estado desde PlayerService
  isVideo = this.playerService.isVideo;
  currentSong = this.playerService.currentSong;
  isPlaying = this.playerService.isPlaying;
  
  // Cover de la canción actual (fallback)
  coverUrl = input('img/default-cover.webp');
  
  // Info de la canción actual (para alt text)
  songTitle = input('Nombre de la Canción');
  
  // Control de sidebars (two-way binding)
  leftSidebar = model<'lyrics' | 'info' | null>(null);
  rightSidebar = model<'playlist' | 'queue' | 'ranking' | null>(null);
  
  ngAfterViewInit(): void {
    // Inicializar el PlayerService con el elemento de video
    if (this.mediaPlayerRef?.nativeElement) {
      this.playerService.initMediaElement(this.mediaPlayerRef.nativeElement);
    }
  }
}
