export interface Song {
  id: number;
  filePath: string;
  
  // Metadata estándar (del archivo)
  title: string;
  artist: string;
  album: string;
  year: number | null;
  genre: string;
  duration: number; // en segundos
  
  // Datos personalizados (de SQLite)
  description: string; // descripción del usuario
  ranking: number | null; // ranking interno (con gaps), null = sin rankear
  rankPosition: number | null; // posición visual 1, 2, 3... (calculada)
  playCount: number; // veces reproducida
  lastPlayed: Date | null;
  notes: string; // notas del usuario
  lyrics: string; // letra de la canción (editable)
  createdAt: Date;
  updatedAt: Date;
}
