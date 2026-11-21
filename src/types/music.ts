import { z } from 'zod';

export type RepeatMode = 'off' | 'one' | 'all';
export type ThemeMode = 'dark' | 'system';
export type SortField = 'title' | 'artist' | 'album' | 'dateAdded' | 'duration' | 'playCount';
export type SortOrder = 'asc' | 'desc';
export type LibraryCategory =
  | 'all-songs'
  | 'albums'
  | 'artists'
  | 'genres'
  | 'folders'
  | 'recently-added';
export type SearchTab = 'songs' | 'artists' | 'albums' | 'playlists' | 'genres';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string | null;
  genre: string;
  folder: string;
  duration: number; // seconds
  fileUri: string;
  artworkUri: string | null;
  fileSize: number; // bytes
  dateAdded: number; // unix timestamp ms
  playCount: number;
  lastPlayedAt: number | null;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artworkUri: string | null;
  year: number | null;
  songCount?: number;
}

export interface Artist {
  id: string;
  name: string;
  artworkUri: string | null;
  songCount?: number;
  albumCount?: number;
}

export interface FolderInfo {
  path: string;
  name: string;
  songCount: number;
}

export interface GenreInfo {
  name: string;
  songCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  artworkUri: string | null;
  createdAt: number;
  updatedAt: number;
  songCount: number;
  coverUris?: string[];
}

export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId: string;
  position: number;
}

export interface PlaybackHistoryEntry {
  id: string;
  songId: string;
  playedAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  useSystemTheme: boolean;
  accentColor: string;
  defaultRepeatMode: RepeatMode;
  shuffleByDefault: boolean;
  defaultPlaybackSpeed: number;
  gaplessPlayback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  useSystemTheme: false,
  accentColor: '#913DFF',
  defaultRepeatMode: 'off',
  shuffleByDefault: false,
  defaultPlaybackSpeed: 1.0,
  gaplessPlayback: false,
};

export const PlaylistNameSchema = z
  .string()
  .trim()
  .min(1, 'Playlist name cannot be empty')
  .max(60, 'Playlist name must be 60 characters or fewer');

export const PlaybackSpeedSchema = z.number().min(0.5).max(2.0);

export const SongInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().min(1),
  albumId: z.string().nullable(),
  genre: z.string().min(1),
  folder: z.string().min(1),
  duration: z.number().nonnegative(),
  fileUri: z.string().min(1),
  artworkUri: z.string().nullable(),
  fileSize: z.number().nonnegative(),
  dateAdded: z.number().nonnegative(),
});
