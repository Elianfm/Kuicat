import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-left-sidebar-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './left-sidebar-controls.component.html',
  styleUrl: './left-sidebar-controls.component.scss'
})
export class LeftSidebarControlsComponent {
  activeView = model<'lyrics' | 'info' | null>(null);
  
  toggle(view: 'lyrics' | 'info'): void {
    this.activeView.update(current => current === view ? null : view);
  }
}
