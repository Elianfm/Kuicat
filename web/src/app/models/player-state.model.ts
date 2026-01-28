import { Song } from './song.model';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number; // 0-100
  currentTime: number; // segundos
  duration: number; // segundos
  playMode: PlayMode;
  queue: Song[];
  queueIndex: number;
}

export type PlayMode = 
  | 'sequential'       // En orden original
  | 'shuffle'          // Aleatorio
  | 'by-ranking'       // Todas las rankeadas (mejor primero)
  | 'top-50'           // Top 50 del ranking
  | 'top-100'          // Top 100 del ranking
  | 'top-200'          // Top 200 del ranking
  | 'top-300'          // Top 300 del ranking
  | 'top-400'          // Top 400 del ranking
  | 'top-500'          // Top 500 del ranking
  | 'unranked'         // Solo no rankeadas (descubrir)
  | 'by-artist'        // Por artista A-Z
  | 'by-genre'         // Por género A-Z
  | 'ai-suggested';    // IA Sugerido (próximamente)
