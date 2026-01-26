import { Component, input, output, ElementRef, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements AfterViewInit {
  @ViewChild('dialogRef') dialogRef!: ElementRef<HTMLDialogElement>;
  
  // Si el modal está abierto
  isOpen = input<boolean>(false);
  
  // Título del modal
  title = input<string>('');
  
  // Evento para cerrar el modal
  closeModal = output<void>();
  
  private viewReady = false;
  
  constructor() {
    // Efecto que reacciona a cambios en isOpen
    effect(() => {
      const shouldOpen = this.isOpen();
      // Solo actuar si la vista está lista
      if (this.viewReady) {
        this.updateDialog(shouldOpen);
      }
    });
  }
  
  ngAfterViewInit(): void {
    this.viewReady = true;
    // Verificar estado inicial
    if (this.isOpen()) {
      this.updateDialog(true);
    }
  }
  
  private updateDialog(shouldOpen: boolean): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    
    if (shouldOpen && !dialog.open) {
      dialog.showModal();
    } else if (!shouldOpen && dialog.open) {
      dialog.close();
    }
  }
  
  onDialogClick(event: MouseEvent): void {
    const dialog = this.dialogRef.nativeElement;
    const rect = dialog.getBoundingClientRect();
    // Si el clic fue en el backdrop (fuera del contenido)
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      this.closeModal.emit();
    }
  }
  
  onCloseClick(): void {
    this.closeModal.emit();
  }
  
  // Manejar cierre con Escape
  onCancel(event: Event): void {
    event.preventDefault();
    this.closeModal.emit();
  }
}
