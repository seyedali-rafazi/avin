import { create } from 'zustand';
import { favoritesRepository, songRepository } from '@/database/repositories';
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
  Song,
  SortField,
  SortOrder,
} from '@/types/music';

interface LibraryState {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  genres: GenreInfo[];
  folders: FolderInfo[];
  recentlyAdded: Song[];
  recentlyPlayed: Song[];
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
  importFiles: () => Promise<{ added: number; error?: string }>;
  toggleFavorite: (songId: string) => boolean;
  isFavorite: (songId: string) => boolean;
  recordSongPlayed: (songId: string) => void;
  clearPlaybackHistory: () => void;
  deleteSong: (songId: string) => void;
  deleteSongs: (songIds: string[]) => void;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  albums: [],
  artists: [],
  genres: [],
  folders: [],
  recentlyAdded: [],
  recentlyPlayed: [],
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
      const recentlyPlayed = songRepository.getRecentlyPlayed(20);
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

    set({ isScanning: true, error: null, scanProgress: { scanned: 0, total: 0, phase: 'requesting-permission' } });
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
      const recentlyPlayed = songRepository.getRecentlyPlayed(20);
      set({ recentlyPlayed });
    } catch {
      // Non-fatal history write error
    }
  },

  clearPlaybackHistory: () => {
    songRepository.clearPlaybackHistory();
    set({ recentlyPlayed: [] });
  },

  deleteSong: (songId) => {
    songRepository.deleteById(songId);
    get().refreshLibrary();
  },

  deleteSongs: (songIds) => {
    if (songIds.length === 0) return;
    songRepository.deleteByIds(songIds);
    get().refreshLibrary();
  },

  clearError: () => set({ error: null }),
}));
