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
  | 'recently-added'
  | 'recently-played'
  | 'most-played'
  | 'never-played';
export type SearchTab = 'songs' | 'artists' | 'albums' | 'playlists' | 'genres';

export type EqualizerPresetId =
  | 'flat'
  | 'pop'
  | 'rock'
  | 'bass-boost'
  | 'vocal'
  | 'classical'
  | 'electronic'
  | 'custom';

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
  year?: number | null;
  lyrics?: string | null;
  isUserEdited?: boolean;
}

export interface SongMetadataPatch {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number | null;
  artworkUri?: string | null;
  lyrics?: string | null;
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

export interface ListeningStats {
  totalPlays: number;
  totalSongs: number;
  playedSongsCount: number;
  totalDurationSeconds: number;
  topArtist: string | null;
  topSong: Song | null;
}

export interface PersistedPlaybackState {
  queueIds: string[];
  originalQueueIds: string[];
  currentIndex: number;
  position: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  volume: number;
}

export interface AppSettings {
  theme: ThemeMode;
  useSystemTheme: boolean;
  accentColor: string;
  defaultRepeatMode: RepeatMode;
  shuffleByDefault: boolean;
  defaultPlaybackSpeed: number;
  gaplessPlayback: boolean;
  crossfadeSeconds: number;
  minSongDuration: number;
  excludedFolders: string[];
  pauseOnAudioRouteChange: boolean;
  equalizerEnabled: boolean;
  equalizerPreset: EqualizerPresetId;
  equalizerBands: number[]; // 5 bands in dB (-12..12)
  bassBoost: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  useSystemTheme: false,
  accentColor: '#913DFF',
  defaultRepeatMode: 'off',
  shuffleByDefault: false,
  defaultPlaybackSpeed: 1.0,
  gaplessPlayback: true,
  crossfadeSeconds: 0,
  minSongDuration: 15,
  excludedFolders: ['WhatsApp Audio', 'WhatsApp Voice Notes', 'Telegram Audio', 'Recordings', 'CallRecordings'],
  pauseOnAudioRouteChange: true,
  equalizerEnabled: false,
  equalizerPreset: 'flat',
  equalizerBands: [0, 0, 0, 0, 0],
  bassBoost: false,
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
  year: z.number().int().nullable().optional(),
  lyrics: z.string().nullable().optional(),
});
