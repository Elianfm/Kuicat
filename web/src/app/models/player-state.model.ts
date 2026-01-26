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

export type PlayMode = 'sequential' | 'shuffle' | 'ai-suggested';
