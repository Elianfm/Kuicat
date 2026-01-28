export interface Playlist {
  id: number;
  name: string;
  icon: string;
  type: PlaylistType;
  filterCriteria: string | null;
  songIds: number[];
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PlaylistType = 'GENRE' | 'ARTIST' | 'TAGS' | 'CUSTOM';

export interface PlaylistCreate {
  name: string;
  icon?: string;
  type?: PlaylistType;
  songIds?: number[];
}
