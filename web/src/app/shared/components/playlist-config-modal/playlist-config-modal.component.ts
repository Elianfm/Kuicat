import { Component, input, output, inject, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../toast/toast.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.component';
import { PlaylistService } from '../../../core/services/playlist.service';
import { Playlist } from '../../../models/playlist.model';

// Iconos disponibles para playlists
const AVAILABLE_ICONS = [
  { icon: 'queue_music', label: 'Música' },
  { icon: 'favorite', label: 'Favoritos' },
  { icon: 'star', label: 'Estrella' },
  { icon: 'work', label: 'Trabajo' },
  { icon: 'spa', label: 'Relax' },
  { icon: 'fitness_center', label: 'Workout' },
  { icon: 'directions_car', label: 'Viaje' },
  { icon: 'nightlife', label: 'Fiesta' },
  { icon: 'coffee', label: 'Café' },
  { icon: 'headphones', label: 'Auriculares' },
  { icon: 'music_note', label: 'Nota' },
  { icon: 'album', label: 'Álbum' },
];

@Component({
  selector: 'app-playlist-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './playlist-config-modal.component.html',
  styleUrl: './playlist-config-modal.component.scss'
})
export class PlaylistConfigModalComponent implements OnChanges {
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly playlistService = inject(PlaylistService);
  
  // Playlist a editar (null = crear nueva)
  playlist = input<Playlist | null>(null);
  
  // Si el modal está abierto
  isOpen = input<boolean>(false);
  
  // Eventos
  closeModal = output<void>();
  openSongSelector = output<number>(); // Emite playlist ID para abrir selector de canciones
  playlistDeleted = output<number>(); // Emite cuando se elimina una playlist
  
  // Lista de iconos disponibles
  readonly availableIcons = AVAILABLE_ICONS;
  
  // Estado del formulario
  name = signal('');
  selectedIcon = signal('queue_music');
  showIconPicker = signal(false);
  saving = signal(false);
  
  // Computed: obtener datos actualizados desde el servicio
  readonly currentPlaylist = computed(() => {
    const inputPlaylist = this.playlist();
    if (!inputPlaylist) return null;
    // Buscar la versión más reciente en el servicio
    return this.playlistService.playlists().find(p => p.id === inputPlaylist.id) || inputPlaylist;
  });
  
  // Computed: si estamos creando o editando
  readonly isEditing = computed(() => this.playlist() !== null);
  readonly modalTitle = computed(() => 
    this.isEditing() ? `Configurar: ${this.currentPlaylist()?.name}` : 'Nueva Playlist'
  );
  
  // Se llama cuando cambia el input playlist
  ngOnChanges(): void {
    const p = this.playlist();
    if (p) {
      this.name.set(p.name);
      this.selectedIcon.set(p.icon);
    } else {
      this.name.set('');
      this.selectedIcon.set('queue_music');
    }
  }
  
  onClose(): void {
    this.showIconPicker.set(false);
    this.closeModal.emit();
  }
  
  toggleIconPicker(): void {
    this.showIconPicker.update(v => !v);
  }
  
  selectIcon(icon: string): void {
    this.selectedIcon.set(icon);
    this.showIconPicker.set(false);
  }
  
  onSave(): void {
    const nameValue = this.name().trim();
    if (!nameValue) {
      this.toastService.error('El nombre es obligatorio');
      return;
    }
    
    this.saving.set(true);
    
    if (this.isEditing()) {
      // Actualizar playlist existente
      const p = this.playlist()!;
      this.playlistService.update(p.id, {
        name: nameValue,
        icon: this.selectedIcon()
      }).subscribe({
        next: () => {
          this.toastService.success('Playlist actualizada');
          this.saving.set(false);
          this.onClose();
        },
        error: () => {
          this.toastService.error('Error al actualizar');
          this.saving.set(false);
        }
      });
    } else {
      // Crear nueva playlist
      this.playlistService.create({
        name: nameValue,
        icon: this.selectedIcon()
      }).subscribe({
        next: () => {
          this.toastService.success('Playlist creada');
          this.saving.set(false);
          this.onClose();
        },
        error: () => {
          this.toastService.error('Error al crear');
          this.saving.set(false);
        }
      });
    }
  }
  
  onManageSongs(): void {
    const p = this.playlist();
    if (p) {
      this.openSongSelector.emit(p.id);
    }
  }
  
  async onDelete(): Promise<void> {
    const p = this.playlist();
    if (!p) return;
    
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar playlist',
      message: `¿Seguro que quieres eliminar "${p.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    
    if (confirmed) {
      this.playlistService.delete(p.id).subscribe({
        next: () => {
          this.toastService.success('Playlist eliminada');
          this.playlistDeleted.emit(p.id);
          this.onClose();
        },
        error: () => {
          this.toastService.error('Error al eliminar');
        }
      });
    }
  }
}
