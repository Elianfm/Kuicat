import { Component, signal, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private resolvePromise: ((value: boolean) => void) | null = null;
  
  config = signal<ConfirmDialogConfig | null>(null);
  isOpen = signal(false);
  
  /**
   * Muestra el dialog de confirmación y retorna una promesa.
   */
  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    this.config.set(config);
    this.isOpen.set(true);
    
    return new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }
  
  close(result: boolean): void {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
  }
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  constructor(public dialogService: ConfirmDialogService) {}
  
  onConfirm(): void {
    this.dialogService.close(true);
  }
  
  onCancel(): void {
    this.dialogService.close(false);
  }
  
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
