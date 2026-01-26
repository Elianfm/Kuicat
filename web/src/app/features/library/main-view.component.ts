import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeftSidebarControlsComponent } from '../../shared/components/left-sidebar-controls/left-sidebar-controls.component';
import { RightSidebarControlsComponent } from '../../shared/components/right-sidebar-controls/right-sidebar-controls.component';

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
export class MainViewComponent {
  // Si hay video activo
  hasVideo = input(false);
  
  // Cover de la canción actual
  coverUrl = input('img/default-cover.webp');
  
  // Info de la canción actual (para alt text)
  songTitle = input('Nombre de la Canción');
  
  // Control de sidebars (two-way binding)
  leftSidebar = model<'lyrics' | 'info' | null>(null);
  rightSidebar = model<'playlist' | 'queue' | null>(null);
}
