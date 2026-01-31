import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { 
  RadioConfig, 
  RadioVoice, 
  RadioPersonalityPreset,
  RadioContext,
  RadioAnnouncement,
  AnnouncementCheck
} from '../../models';

/**
 * Servicio para el Modo Radio IA.
 * Gestiona la configuración, generación de anuncios y transiciones.
 */
@Injectable({
  providedIn: 'root'
})
export class RadioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/radio';
  
  // Estado del radio
  private readonly _config = signal<RadioConfig | null>(null);
  private readonly _isGenerating = signal(false);
  private readonly _sessionStartTime = signal<Date | null>(null);
  private readonly _songsPlayedCount = signal(0);
  
  // Computed
  readonly config = this._config.asReadonly();
  readonly isEnabled = computed(() => this._config()?.enabled ?? false);
  readonly isGenerating = this._isGenerating.asReadonly();
  
  constructor() {
    // Cargar configuración inicial
    this.loadConfig();
  }
  
  /**
   * Carga la configuración del radio desde el backend.
   */
  async loadConfig(): Promise<RadioConfig> {
    const config = await firstValueFrom(
      this.http.get<RadioConfig>(`${this.baseUrl}/config`)
    );
    this._config.set(config);
    return config;
  }
  
  /**
   * Actualiza la configuración del radio.
   */
  async updateConfig(config: Partial<RadioConfig>): Promise<RadioConfig> {
    const updated = await firstValueFrom(
      this.http.put<RadioConfig>(`${this.baseUrl}/config`, config)
    );
    this._config.set(updated);
    return updated;
  }
  
  /**
   * Activa o desactiva el modo radio.
   */
  async toggle(): Promise<RadioConfig> {
    const config = await firstValueFrom(
      this.http.post<RadioConfig>(`${this.baseUrl}/toggle`, {})
    );
    this._config.set(config);
    
    // Iniciar/resetear sesión
    if (config.enabled) {
      this._sessionStartTime.set(new Date());
      this._songsPlayedCount.set(0);
    } else {
      this._sessionStartTime.set(null);
    }
    
    return config;
  }
  
  /**
   * Obtiene las voces disponibles para TTS.
   */
  getVoices(): Observable<RadioVoice[]> {
    return this.http.get<RadioVoice[]>(`${this.baseUrl}/voices`);
  }
  
  /**
   * Obtiene los presets de personalidad.
   */
  getPersonalities(): Observable<RadioPersonalityPreset[]> {
    return this.http.get<RadioPersonalityPreset[]>(`${this.baseUrl}/personalities`);
  }
  
  /**
   * Verifica si es momento de hacer un anuncio.
   * Llamar después de cada canción. INCREMENTA el contador.
   */
  checkForAnnouncement(): Observable<AnnouncementCheck> {
    this._songsPlayedCount.update(c => c + 1);
    return this.http.post<AnnouncementCheck>(`${this.baseUrl}/check`, {});
  }
  
  /**
   * Consulta si tocará anuncio en la SIGUIENTE transición.
   * NO incrementa el contador - solo lee el estado actual.
   * Usado para pre-generación.
   */
  peekForAnnouncement(): Observable<AnnouncementCheck> {
    return this.http.get<AnnouncementCheck>(`${this.baseUrl}/peek`);
  }
  
  /**
   * Obtiene el tiempo de inicio de la sesión actual.
   */
  getSessionStartTime(): Date | null {
    return this._sessionStartTime();
  }
  
  /**
   * Obtiene el número de canciones reproducidas en esta sesión.
   */
  getSongsPlayedCount(): number {
    return this._songsPlayedCount();
  }
  
  /**
   * Genera un anuncio de radio.
   */
  generateAnnouncement(context: RadioContext): Observable<RadioAnnouncement> {
    this._isGenerating.set(true);
    
    // Añadir info de sesión al contexto
    const sessionStart = this._sessionStartTime();
    const enrichedContext: RadioContext = {
      ...context,
      songsPlayedCount: this._songsPlayedCount(),
      sessionMinutes: sessionStart 
        ? Math.floor((Date.now() - sessionStart.getTime()) / 60000)
        : undefined
    };
    
    return new Observable(subscriber => {
      this.http.post<RadioAnnouncement>(`${this.baseUrl}/generate`, enrichedContext)
        .subscribe({
          next: (announcement) => {
            this._isGenerating.set(false);
            subscriber.next(announcement);
            subscriber.complete();
          },
          error: (error) => {
            this._isGenerating.set(false);
            console.error('Error generando anuncio:', error);
            subscriber.error(error);
          }
        });
    });
  }
  
  /**
   * Parsea una URL de audio dual.
   * Formato: "dual:URL1|URL2"
   * @deprecated Usar parseMultiAudioUrl para el nuevo formato multi:
   */
  parseDualAudioUrl(audioUrl: string): { url1: string; url2: string } | null {
    if (audioUrl.startsWith('dual:')) {
      const parts = audioUrl.substring(5).split('|');
      if (parts.length === 2) {
        return { url1: this.toProxyUrl(parts[0]), url2: this.toProxyUrl(parts[1]) };
      }
    }
    return null;
  }
  
  /**
   * Parsea una URL de audio múltiple.
   * Formato: "multi:URL1|URL2|URL3" (para modo dual con 3 líneas alternadas)
   * También soporta "dual:URL1|URL2" por compatibilidad.
   */
  parseMultiAudioUrl(audioUrl: string): string[] | null {
    if (audioUrl.startsWith('multi:')) {
      const parts = audioUrl.substring(6).split('|');
      return parts.map(url => this.toProxyUrl(url));
    }
    // Compatibilidad con formato anterior
    if (audioUrl.startsWith('dual:')) {
      const parts = audioUrl.substring(5).split('|');
      return parts.map(url => this.toProxyUrl(url));
    }
    return null;
  }
  
  /**
   * Convierte una URL externa a URL del proxy local.
   * Esto permite usar Web Audio API sin problemas de CORS.
   */
  toProxyUrl(externalUrl: string): string {
    // Si ya es una URL local, no hacer nada
    if (externalUrl.startsWith('/') || externalUrl.startsWith('http://localhost')) {
      return externalUrl;
    }
    
    // Codificar URL en Base64 URL-safe
    const encoded = btoa(externalUrl)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return `${this.baseUrl}/audio/${encoded}`;
  }
  
  /**
   * Calcula los minutos de sesión.
   */
  getSessionMinutes(): number {
    const start = this._sessionStartTime();
    if (!start) return 0;
    return Math.floor((Date.now() - start.getTime()) / 60000);
  }
}
