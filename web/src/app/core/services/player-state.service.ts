import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PersistedPlayerState } from '../../models';

/**
 * Servicio para persistir y restaurar el estado del reproductor.
 * Guarda automáticamente cada minuto y al cerrar la app.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerStateService {
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly baseUrl = '/api/player/state';
  
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private getStateFn: (() => PersistedPlayerState) | null = null;
  
  /**
   * Inicia el auto-guardado cada minuto.
   * @param getState Función que devuelve el estado actual del reproductor
   */
  startAutoSave(getState: () => PersistedPlayerState): void {
    this.getStateFn = getState;
    
    // Guardar cada minuto
    this.ngZone.runOutsideAngular(() => {
      this.autoSaveInterval = setInterval(() => {
        this.saveCurrentState();
      }, 60000); // 1 minuto
    });
    
    // Guardar al cerrar la pestaña/navegador
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * Detiene el auto-guardado.
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * Guarda el estado actual (llamado automáticamente o manualmente).
   */
  async saveCurrentState(): Promise<void> {
    if (!this.getStateFn) return;
    
    try {
      const state = this.getStateFn();
      await this.saveState(state);
    } catch (err) {
      console.error('[PlayerStateService] Error saving state:', err);
    }
  }
  
  /**
   * Obtiene el estado guardado del servidor.
   */
  async getState(): Promise<PersistedPlayerState> {
    return firstValueFrom(
      this.http.get<PersistedPlayerState>(this.baseUrl)
    );
  }
  
  /**
   * Guarda el estado en el servidor.
   */
  async saveState(state: PersistedPlayerState): Promise<PersistedPlayerState> {
    return firstValueFrom(
      this.http.put<PersistedPlayerState>(this.baseUrl, state)
    );
  }
  
  /**
   * Limpia el estado guardado.
   */
  async clearState(): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(this.baseUrl)
    );
  }
  
  /**
   * Handler para beforeunload - guarda estado al cerrar.
   */
  private handleBeforeUnload = (): void => {
    if (!this.getStateFn) return;
    
    // Usar sendBeacon para garantizar que se envíe antes de cerrar
    const state = this.getStateFn();
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    navigator.sendBeacon(this.baseUrl, blob);
  };
}
