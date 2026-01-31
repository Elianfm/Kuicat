import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface SettingResponse {
  key: string;
  value: string;
}

export interface SettingsMap {
  [key: string]: string;
}

/**
 * Servicio para gestionar configuraciones de la aplicación.
 * Las API keys se envían al backend y nunca se almacenan en el frontend.
 */
@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8741/api/settings';
  
  // Estado local (valores enmascarados)
  private readonly _settings = signal<SettingsMap>({});
  readonly settings = this._settings.asReadonly();
  
  // Claves conocidas
  static readonly OPENAI_API_KEY = 'openai_api_key';
  static readonly REPLICATE_API_KEY = 'replicate_api_key';
  
  /**
   * Carga todas las configuraciones (enmascaradas).
   */
  loadSettings(): Observable<SettingsMap> {
    return this.http.get<SettingsMap>(this.baseUrl).pipe(
      tap(settings => this._settings.set(settings))
    );
  }
  
  /**
   * Obtiene una configuración específica (enmascarada).
   */
  getSetting(key: string): Observable<string> {
    return this.http.get<SettingResponse>(`${this.baseUrl}/${key}`).pipe(
      map(response => response.value)
    );
  }
  
  /**
   * Verifica si una API key está configurada.
   */
  hasApiKey(key: string): Observable<boolean> {
    return this.http.get<{ exists: boolean }>(`${this.baseUrl}/${key}/exists`).pipe(
      map(response => response.exists)
    );
  }
  
  /**
   * Guarda una configuración.
   * Para API keys, el valor se envía y el backend lo ofusca.
   */
  saveSetting(key: string, value: string): Observable<SettingResponse> {
    return this.http.post<SettingResponse>(`${this.baseUrl}/${key}`, { value }).pipe(
      tap(response => {
        // Actualizar estado local con valor enmascarado
        this._settings.update(settings => ({
          ...settings,
          [response.key]: response.value
        }));
      })
    );
  }
  
  /**
   * Elimina una configuración.
   */
  deleteSetting(key: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${key}`).pipe(
      tap(() => {
        this._settings.update(settings => {
          const { [key]: _, ...rest } = settings;
          return rest;
        });
      })
    );
  }
  
  /**
   * Obtiene el valor enmascarado de una configuración del estado local.
   */
  getLocalSetting(key: string): string | undefined {
    return this._settings()[key];
  }
  
  /**
   * Verifica si hay API keys configuradas localmente.
   */
  hasOpenAIKey(): boolean {
    const value = this._settings()[SettingsService.OPENAI_API_KEY];
    return !!value && value !== '';
  }
  
  hasReplicateKey(): boolean {
    const value = this._settings()[SettingsService.REPLICATE_API_KEY];
    return !!value && value !== '';
  }
}
