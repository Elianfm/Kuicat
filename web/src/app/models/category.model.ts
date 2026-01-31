/**
 * Representa una categoría (artista o género) con su conteo de canciones.
 */
export interface CategoryCount {
  name: string;
  count: number;
}

/**
 * Tipo de categoría para playlist rápida.
 */
export type QuickPlaylistType = 'artist' | 'genre';
