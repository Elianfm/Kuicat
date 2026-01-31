import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../toast/toast.component';
import { LibraryService, ScanResult } from '../../../core/services/library.service';
import { SettingsService } from '../../../core/services/settings.service';

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
export class ConfigModalComponent implements OnInit {
  private readonly toastService = inject(ToastService);
  private readonly libraryService = inject(LibraryService);
  private readonly settingsService = inject(SettingsService);
  
  // Si el modal está abierto
  isOpen = input<boolean>(false);
  
  // Configuración actual
  config = input<AppConfig>({ videosPath: '' });
  
  // Eventos
  closeModal = output<void>();
  configChange = output<AppConfig>();
  
  // Estado local para edición
  videosPath = signal<string>('');
  
  // API Keys (valores para el input, no los enmascarados)
  openaiApiKey = signal<string>('');
  replicateApiKey = signal<string>('');
  
  // Valores enmascarados actuales
  openaiKeyMasked = signal<string>('');
  replicateKeyMasked = signal<string>('');
  
  // Estado de guardado de API keys
  savingOpenAI = signal<boolean>(false);
  savingReplicate = signal<boolean>(false);
  
  // Estado del escaneo
  isScanning = signal<boolean>(false);
  scanResult = signal<ScanResult | null>(null);
  
  ngOnInit(): void {
    this.loadApiKeys();
  }
  
  /**
   * Carga los valores enmascarados de las API keys.
   */
  private loadApiKeys(): void {
    this.settingsService.loadSettings().subscribe({
      next: (settings) => {
        this.openaiKeyMasked.set(settings[SettingsService.OPENAI_API_KEY] || '');
        this.replicateKeyMasked.set(settings[SettingsService.REPLICATE_API_KEY] || '');
      },
      error: (err) => console.error('Error cargando settings:', err)
    });
  }
  
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
  
  /**
   * Guarda la API key de OpenAI.
   */
  saveOpenAIKey(): void {
    const key = this.openaiApiKey().trim();
    if (!key) {
      this.toastService.warning('Ingresa una API key válida');
      return;
    }
    
    this.savingOpenAI.set(true);
    this.settingsService.saveSetting(SettingsService.OPENAI_API_KEY, key).subscribe({
      next: (response) => {
        this.openaiKeyMasked.set(response.value);
        this.openaiApiKey.set(''); // Limpiar input
        this.savingOpenAI.set(false);
        this.toastService.success('API key de OpenAI guardada');
      },
      error: (err) => {
        this.savingOpenAI.set(false);
        this.toastService.error('Error guardando API key');
      }
    });
  }
  
  /**
   * Guarda la API key de Replicate.
   */
  saveReplicateKey(): void {
    const key = this.replicateApiKey().trim();
    if (!key) {
      this.toastService.warning('Ingresa una API key válida');
      return;
    }
    
    this.savingReplicate.set(true);
    this.settingsService.saveSetting(SettingsService.REPLICATE_API_KEY, key).subscribe({
      next: (response) => {
        this.replicateKeyMasked.set(response.value);
        this.replicateApiKey.set(''); // Limpiar input
        this.savingReplicate.set(false);
        this.toastService.success('API key de Replicate guardada');
      },
      error: (err) => {
        this.savingReplicate.set(false);
        this.toastService.error('Error guardando API key');
      }
    });
  }
  
  /**
   * Elimina una API key.
   */
  deleteApiKey(key: string): void {
    this.settingsService.deleteSetting(key).subscribe({
      next: () => {
        if (key === SettingsService.OPENAI_API_KEY) {
          this.openaiKeyMasked.set('');
        } else if (key === SettingsService.REPLICATE_API_KEY) {
          this.replicateKeyMasked.set('');
        }
        this.toastService.success('API key eliminada');
      },
      error: () => this.toastService.error('Error eliminando API key')
    });
  }
}
