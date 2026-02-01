/**
 * Configuración del Modo Radio IA
 */
export interface RadioConfig {
  radioName: string;
  userName?: string;
  frequency: number;
  
  // Personalidad (Host 1)
  personality: RadioPersonality;
  customPersonality?: string;
  
  // Personalidad (Host 2 - solo en modo dual)
  personality2?: RadioPersonality;
  customPersonality2?: string;
  
  // Instrucciones personalizadas del usuario
  userInstructions?: string;
  
  // Voces
  voice1: string;
  djName1?: string;
  voice2?: string;
  djName2?: string;
  dualMode: boolean;
  
  // Efectos
  enableJingles: boolean;
  enableEffects: boolean;
  
  // Estado
  enabled: boolean;
  songCounter: number;
}

export type RadioPersonality = 
  | 'energetic' 
  | 'classic' 
  | 'casual' 
  | 'critic' 
  | 'nostalgic' 
  | 'custom';

/**
 * Voz disponible para TTS
 */
export interface RadioVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: 'American' | 'British';
  quality: 'A' | 'B' | 'C' | 'D';
}

/**
 * Preset de personalidad
 */
export interface RadioPersonalityPreset {
  id: RadioPersonality;
  name: string;
  description: string;
}

/**
 * Contexto para generar anuncio
 */
export interface RadioContext {
  // Canción anterior
  previousTitle?: string;
  previousArtist?: string;
  previousAlbum?: string;
  previousGenre?: string;
  previousYear?: number;
  previousDescription?: string;
  previousRankPosition?: number;
  
  // Canción siguiente
  nextTitle?: string;
  nextArtist?: string;
  nextAlbum?: string;
  nextGenre?: string;
  nextYear?: number;
  nextDescription?: string;
  nextRankPosition?: number;
  
  // Historial de canciones (formato: "Título - Artista")
  previousSongs?: string[];
  upcomingSongs?: string[];
  
  // Contexto de sesión
  songsPlayedCount?: number;
  sessionMinutes?: number;
}

/**
 * Parámetros de transición
 */
export interface TransitionParams {
  fadeOutDuration: number;  // ms
  preSilence: number;       // ms
  postSilence: number;      // ms
  fadeInDuration: number;   // ms
}

/**
 * Respuesta del endpoint de generación de anuncio
 */
export interface RadioAnnouncement {
  audioUrl: string;
  duration: number;
  script: string;
  transition: TransitionParams;
}

/**
 * Estado de verificación de anuncio
 */
export interface AnnouncementCheck {
  shouldAnnounce: boolean;
  enabled: boolean;
  currentCount?: number;
  frequency?: number;
}
