import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-sidebar-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-sidebar-controls.component.html',
  styleUrl: './right-sidebar-controls.component.scss'
})
export class RightSidebarControlsComponent {
  activeView = model<'playlist' | 'queue' | 'ranking' | null>(null);
  
  toggle(view: 'playlist' | 'queue' | 'ranking'): void {
    this.activeView.update(current => current === view ? null : view);
  }
}
