import { Component, signal, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private counter = 0;
  toasts = signal<ToastMessage[]>([]);
  
  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000): void {
    const id = ++this.counter;
    this.toasts.update(toasts => [...toasts, { id, message, type }]);
    
    setTimeout(() => {
      this.toasts.update(toasts => toasts.filter(t => t.id !== id));
    }, duration);
  }
  
  success(message: string): void {
    this.show(message, 'success');
  }
  
  error(message: string): void {
    this.show(message, 'error');
  }
  
  info(message: string): void {
    this.show(message, 'info');
  }
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
