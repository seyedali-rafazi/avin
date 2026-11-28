import { create } from 'zustand';
import { favoritesRepository, songRepository } from '@/database/repositories';
import { fileActionsService } from '@/services/media/fileActionsService';
import {
  mediaScannerService,
  type ScanProgress,
  type ScanResult,
} from '@/services/media/mediaScannerService';
import type {
  Album,
  Artist,
  FolderInfo,
  GenreInfo,
  ListeningStats,
  Song,
  SongMetadataPatch,
  SortField,
  SortOrder,
} from '@/types/music';

const EMPTY_STATS: ListeningStats = {
  totalPlays: 0,
  totalSongs: 0,
  playedSongsCount: 0,
  totalDurationSeconds: 0,
  topArtist: null,
  topSong: null,
};

interface LibraryState {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  genres: GenreInfo[];
  folders: FolderInfo[];
  recentlyAdded: Song[];
  recentlyPlayed: Song[];
  mostPlayed: Song[];
  neverPlayed: Song[];
  listeningStats: ListeningStats;
  favoriteIds: Set<string>;
  favoriteSongs: Song[];
  sortBy: SortField;
  sortOrder: SortOrder;
  isLoading: boolean;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastScanResult: ScanResult | null;
  error: string | null;

  refreshLibrary: () => void;
  setSorting: (sortBy: SortField, sortOrder: SortOrder) => void;
  scanDevice: () => Promise<ScanResult>;
  syncLibrarySilently: () => Promise<void>;
  importFiles: () => Promise<{ added: number; error?: string }>;
  toggleFavorite: (songId: string) => boolean;
  isFavorite: (songId: string) => boolean;
  recordSongPlayed: (songId: string) => void;
  clearPlaybackHistory: () => void;
  updateSongMetadata: (songId: string, patch: SongMetadataPatch) => Song | null;
  deleteSong: (songId: string) => void;
  deleteSongFromDevice: (song: Song) => Promise<{ deletedFromStorage: boolean; message?: string }>;
  deleteSongs: (songIds: string[]) => void;
  clearError: () => void;
}

let isAutoSyncing = false;

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  albums: [],
  artists: [],
  genres: [],
  folders: [],
  recentlyAdded: [],
  recentlyPlayed: [],
  mostPlayed: [],
  neverPlayed: [],
  listeningStats: EMPTY_STATS,
  favoriteIds: new Set<string>(),
  favoriteSongs: [],
  sortBy: 'title',
  sortOrder: 'asc',
  isLoading: false,
  isScanning: false,
  scanProgress: null,
  lastScanResult: null,
  error: null,

  refreshLibrary: () => {
    const { sortBy, sortOrder } = get();
    try {
      const allSongs = songRepository.getAll(sortBy, sortOrder);
      const allAlbums = songRepository.getAlbums();
      const allArtists = songRepository.getArtists();
      const allGenres = songRepository.getGenres();
      const allFolders = songRepository.getFolders();
      const recentlyAdded = songRepository.getRecentlyAdded(50);
      const recentlyPlayed = songRepository.getRecentlyPlayed(50);
      const mostPlayed = songRepository.getMostPlayed(50);
      const neverPlayed = songRepository.getNeverPlayed(100);
      const listeningStats = songRepository.getListeningStats();
      const favIds = new Set(favoritesRepository.getFavoriteSongIds());
      const favSongs = favoritesRepository.getFavoriteSongs('dateAdded', 'desc');

      set({
        songs: allSongs,
        albums: allAlbums,
        artists: allArtists,
        genres: allGenres,
        folders: allFolders,
        recentlyAdded,
        recentlyPlayed,
        mostPlayed,
        neverPlayed,
        listeningStats,
        favoriteIds: favIds,
        favoriteSongs: favSongs,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load music library.',
      });
    }
  },

  setSorting: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
    get().refreshLibrary();
  },

  scanDevice: async () => {
    if (get().isScanning) {
      return {
        permissionGranted: true,
        scanned: 0,
        added: 0,
        updated: 0,
        removed: 0,
      };
    }

    set({
      isScanning: true,
      error: null,
      scanProgress: { scanned: 0, total: 0, phase: 'requesting-permission' },
    });
    const result = await mediaScannerService.scanDeviceLibrary((progress) => {
      set({ scanProgress: progress });
    });

    get().refreshLibrary();
    set({
      isScanning: false,
      lastScanResult: result,
      scanProgress: null,
      error: result.error ?? null,
    });
    return result;
  },

  syncLibrarySilently: async () => {
    if (isAutoSyncing || get().isScanning) return;
    isAutoSyncing = true;
    try {
      const result = await mediaScannerService.checkAndSyncChanges();
      if (result && !result.error && (result.added > 0 || result.updated > 0 || result.removed > 0)) {
        get().refreshLibrary();
      }
    } catch {
      // Silent auto-sync errors are non-fatal
    } finally {
      isAutoSyncing = false;
    }
  },

  importFiles: async () => {
    set({ error: null });
    const result = await mediaScannerService.importAudioFiles();
    if (result.added > 0) {
      get().refreshLibrary();
    }
    if (result.error) {
      set({ error: result.error });
    }
    return result;
  },

  toggleFavorite: (songId) => {
    const nowFav = favoritesRepository.toggle(songId);
    const nextIds = new Set(get().favoriteIds);
    if (nowFav) {
      nextIds.add(songId);
    } else {
      nextIds.delete(songId);
    }
    const favoriteSongs = favoritesRepository.getFavoriteSongs('dateAdded', 'desc');
    set({ favoriteIds: nextIds, favoriteSongs });
    return nowFav;
  },

  isFavorite: (songId) => get().favoriteIds.has(songId),

  recordSongPlayed: (songId) => {
    try {
      songRepository.recordPlay(songId);
      const recentlyPlayed = songRepository.getRecentlyPlayed(50);
      const mostPlayed = songRepository.getMostPlayed(50);
      const neverPlayed = songRepository.getNeverPlayed(100);
      const listeningStats = songRepository.getListeningStats();
      set({ recentlyPlayed, mostPlayed, neverPlayed, listeningStats });
    } catch {
      // Non-fatal history write error
    }
  },

  clearPlaybackHistory: () => {
    songRepository.clearPlaybackHistory();
    get().refreshLibrary();
  },

  updateSongMetadata: (songId, patch) => {
    const updated = songRepository.updateMetadata(songId, patch);
    if (updated) {
      get().refreshLibrary();
    }
    return updated;
  },

  deleteSong: (songId) => {
    songRepository.deleteById(songId);
    get().refreshLibrary();
  },

  deleteSongFromDevice: async (song) => {
    const res = await fileActionsService.deleteAudioFileFromDevice(song);
    songRepository.deleteById(song.id);
    get().refreshLibrary();
    return res;
  },

  deleteSongs: (songIds) => {
    if (songIds.length === 0) return;
    songRepository.deleteByIds(songIds);
    get().refreshLibrary();
  },

  clearError: () => set({ error: null }),
}));
