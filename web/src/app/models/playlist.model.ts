export interface Playlist {
  id: number;
  name: string;
  type: PlaylistType;
  filterCriteria: FilterCriteria | null;
  songIds: number[];
  createdAt: Date;
}

export type PlaylistType = 'genre' | 'artist' | 'tags' | 'custom';

export interface FilterCriteria {
  genres?: string[];
  artists?: string[];
  tags?: string[];
  minRating?: number;
}
