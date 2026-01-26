import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../toast/toast.component';
import { LibraryService, ScanResult } from '../../../core/services/library.service';

export interface AppConfig {
  videosPath: string;
}

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './config-modal.component.html',
  styleUrl: './config-modal.component.scss'
})
export class ConfigModalComponent {
  private readonly toastService = inject(ToastService);
  private readonly libraryService = inject(LibraryService);
  
  // Si el modal está abierto
  isOpen = input<boolean>(false);
  
  // Configuración actual
  config = input<AppConfig>({ videosPath: '' });
  
  // Eventos
  closeModal = output<void>();
  configChange = output<AppConfig>();
  
  // Estado local para edición
  videosPath = signal<string>('');
  
  // Estado del escaneo
  isScanning = signal<boolean>(false);
  scanResult = signal<ScanResult | null>(null);
  
  // Inicializar con la config actual cuando se abre
  ngOnChanges(): void {
    if (this.isOpen()) {
      this.videosPath.set(this.config().videosPath);
    }
  }
  
  onClose(): void {
    this.closeModal.emit();
  }
  
  onSave(): void {
    const newConfig: AppConfig = {
      videosPath: this.videosPath().trim()
    };
    
    this.configChange.emit(newConfig);
    this.toastService.success('Configuración guardada');
    this.closeModal.emit();
  }
  
  onBrowse(): void {
    // TODO: En producción, esto abriría un diálogo de selección de carpeta
    // Por ahora solo mostramos un mensaje
    this.toastService.info('Selección de carpeta disponible próximamente');
  }
  
  onScan(): void {
    const path = this.videosPath().trim();
    if (!path) {
      this.toastService.warning('Ingresa una ruta de carpeta primero');
      return;
    }
    
    this.isScanning.set(true);
    this.scanResult.set(null);
    
    this.libraryService.scanFolder(path).subscribe({
      next: (result) => {
        this.scanResult.set(result);
        this.isScanning.set(false);
        
        if (result.errors > 0) {
          this.toastService.warning(`Escaneo completado con ${result.errors} errores`);
        } else {
          this.toastService.success(`Escaneo completado: ${result.newSongs} nuevas canciones`);
        }
      },
      error: (err) => {
        this.isScanning.set(false);
        this.toastService.error('Error al escanear: ' + (err.message || 'Error desconocido'));
      }
    });
  }
}
