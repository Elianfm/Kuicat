import { Injectable } from '@angular/core';

/**
 * Interfaz para items en la cola de generación.
 */
interface QueueItem {
  songId: number;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

/**
 * Servicio para generar y cachear thumbnails de videos.
 * Usa IndexedDB para persistir los thumbnails entre sesiones.
 * Implementa una cola de generación con concurrencia limitada.
 */
@Injectable({
  providedIn: 'root'
})
export class ThumbnailService {
  private readonly baseUrl = 'http://localhost:8741/api';
  private readonly dbName = 'kuicat-thumbnails';
  private readonly storeName = 'thumbnails';
  private readonly dbVersion = 1;
  
  // Caché en memoria para acceso rápido
  private readonly memoryCache = new Map<number, string>();
  
  // Promesas pendientes para evitar generación duplicada
  private readonly pendingGenerations = new Map<number, Promise<string>>();
  
  // DB instance
  private db: IDBDatabase | null = null;

  // ========== QUEUE SYSTEM ==========
  // Cola de generación de thumbnails
  private readonly generationQueue: QueueItem[] = [];
  
  // Número máximo de generaciones simultáneas
  private readonly MAX_CONCURRENT = 2;
  
  // Número actual de generaciones en proceso
  private activeGenerations = 0;
  
  constructor() {
    // Inicializar DB de forma diferida
    setTimeout(() => this.initDB(), 0);
  }
  
  /**
   * Inicializa IndexedDB para persistir thumbnails.
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.warn('No se pudo abrir IndexedDB para thumbnails:', request.error);
        resolve(); // Continuar sin persistencia
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'songId' });
        }
      };
    });
  }
  
  /**
   * Obtiene el thumbnail para un video.
   * Primero busca en caché (memoria -> IndexedDB), si no existe lo encola para generar.
   * 
   * @param songId ID de la canción/video
   * @param filePath Ruta del archivo para determinar si es video
   * @returns Data URL del thumbnail o null si no es video/error
   */
  async getThumbnail(songId: number, filePath: string): Promise<string | null> {
    // Solo generar para videos
    if (!this.isVideoFile(filePath)) {
      return null;
    }
    
    // 1. Buscar en memoria
    if (this.memoryCache.has(songId)) {
      return this.memoryCache.get(songId)!;
    }
    
    // 2. Buscar en IndexedDB
    const cached = await this.getFromDB(songId);
    if (cached) {
      this.memoryCache.set(songId, cached);
      return cached;
    }
    
    // 3. Verificar si ya hay una generación pendiente
    if (this.pendingGenerations.has(songId)) {
      return this.pendingGenerations.get(songId)!;
    }
    
    // 4. Encolar para generación (con concurrencia limitada)
    const generationPromise = this.enqueueGeneration(songId);
    this.pendingGenerations.set(songId, generationPromise);
    
    try {
      const thumbnail = await generationPromise;
      this.pendingGenerations.delete(songId);
      return thumbnail;
    } catch (error) {
      this.pendingGenerations.delete(songId);
      throw error;
    }
  }

  // ========== QUEUE METHODS ==========
  
  /**
   * Encola una generación de thumbnail.
   * Retorna una promesa que se resuelve cuando el thumbnail está listo.
   */
  private enqueueGeneration(songId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.generationQueue.push({ songId, resolve, reject });
      this.processQueue();
    });
  }
  
  /**
   * Procesa la cola de generación respetando el límite de concurrencia.
   */
  private processQueue(): void {
    // Si ya estamos al límite de concurrencia, esperar
    if (this.activeGenerations >= this.MAX_CONCURRENT) {
      return;
    }
    
    // Si no hay nada en la cola, terminar
    const item = this.generationQueue.shift();
    if (!item) {
      return;
    }
    
    // Incrementar contador de generaciones activas
    this.activeGenerations++;
    
    // Generar el thumbnail
    this.generateThumbnail(item.songId)
      .then(thumbnail => {
        item.resolve(thumbnail);
      })
      .catch(error => {
        item.reject(error);
      })
      .finally(() => {
        // Decrementar contador y procesar siguiente
        this.activeGenerations--;
        this.processQueue();
      });
    
    // Intentar llenar más slots si hay disponibles
    this.processQueue();
  }
  
  /**
   * Genera un thumbnail del video a la mitad de su duración.
   */
  private async generateThumbnail(songId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      
      const streamUrl = `${this.baseUrl}/media/${songId}/stream`;
      let timeoutId: ReturnType<typeof setTimeout>;
      let resolved = false;
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        video.remove();
      };
      
      const resolveSuccess = (dataUrl: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(dataUrl);
      };
      
      const rejectError = (error: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(error);
      };
      
      video.onloadedmetadata = () => {
        // Usar 10% del video en vez de 50% para carga más rápida
        // y evitar buffering largo
        video.currentTime = Math.min(video.duration * 0.1, 30); // máximo 30 segundos
      };
      
      video.onseeked = () => {
        try {
          // Crear canvas y capturar frame
          const canvas = document.createElement('canvas');
          const targetWidth = 200; // Thumbnail pequeño para eficiencia
          const scale = targetWidth / video.videoWidth;
          
          canvas.width = targetWidth;
          canvas.height = video.videoHeight * scale;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            rejectError(new Error('No se pudo obtener contexto 2D'));
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convertir a data URL (JPEG para menor tamaño)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Guardar en caché
          this.memoryCache.set(songId, dataUrl);
          this.saveToDB(songId, dataUrl);
          
          resolveSuccess(dataUrl);
        } catch (error) {
          rejectError(error as Error);
        }
      };
      
      video.onerror = () => {
        rejectError(new Error(`Error al cargar video para thumbnail: ${songId}`));
      };
      
      // Timeout más largo (30 segundos) para videos grandes
      timeoutId = setTimeout(() => {
        rejectError(new Error('Timeout generando thumbnail'));
      }, 30000);
      
      video.src = streamUrl;
    });
  }
  
  /**
   * Busca un thumbnail en IndexedDB.
   */
  private async getFromDB(songId: number): Promise<string | null> {
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(songId);
        
        request.onsuccess = () => {
          resolve(request.result?.dataUrl || null);
        };
        
        request.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }
  
  /**
   * Guarda un thumbnail en IndexedDB.
   */
  private async saveToDB(songId: number, dataUrl: string): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put({ songId, dataUrl, createdAt: Date.now() });
    } catch (error) {
      console.warn('Error guardando thumbnail en IndexedDB:', error);
    }
  }
  
  /**
   * Limpia todos los thumbnails cacheados.
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.clear();
      } catch (error) {
        console.warn('Error limpiando caché de thumbnails:', error);
      }
    }
  }
  
  /**
   * Determina si un archivo es video basándose en su extensión.
   */
  private isVideoFile(filePath: string): boolean {
    const videoExtensions = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov']);
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.has(ext);
  }
  
  /**
   * Pre-genera thumbnails para una lista de videos.
   * Útil para cargar thumbnails en segundo plano.
   */
  async preloadThumbnails(songs: Array<{ id: number; filePath: string }>): Promise<void> {
    const videos = songs.filter(s => this.isVideoFile(s.filePath));
    
    // Generar en paralelo pero con límite
    const batchSize = 3;
    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = videos.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(v => this.getThumbnail(v.id, v.filePath))
      );
    }
  }
}
