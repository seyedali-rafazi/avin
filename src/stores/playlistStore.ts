import { create } from 'zustand';
import { playlistRepository } from '@/database/repositories';
import type { Playlist, Song } from '@/types/music';

interface PlaylistState {
  playlists: Playlist[];
  error: string | null;

  refreshPlaylists: () => void;
  createPlaylist: (name: string) => Playlist | null;
  createPlaylistWithSongs: (name: string, songIds: string[]) => Playlist | null;
  renamePlaylist: (id: string, name: string) => boolean;
  updatePlaylistArtwork: (id: string, artworkUri: string | null) => void;
  deletePlaylist: (id: string) => void;
  getPlaylistSongs: (playlistId: string) => Song[];
  addSongsToPlaylist: (playlistId: string, songIds: string[]) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  reorderPlaylistSongs: (playlistId: string, orderedSongIds: string[]) => void;
  clearError: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  error: null,

  refreshPlaylists: () => {
    try {
      const playlists = playlistRepository.getAll();
      set({ playlists });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load playlists.' });
    }
  },

  createPlaylist: (name) => {
    try {
      const created = playlistRepository.create(name);
      get().refreshPlaylists();
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unable to create playlist.' });
      return null;
    }
  },

  createPlaylistWithSongs: (name, songIds) => {
    try {
      const created = playlistRepository.create(name);
      if (songIds.length > 0) {
        playlistRepository.addSongs(created.id, songIds);
      }
      get().refreshPlaylists();
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unable to create playlist.' });
      return null;
    }
  },

  renamePlaylist: (id, name) => {
    try {
      playlistRepository.rename(id, name);
      get().refreshPlaylists();
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unable to rename playlist.' });
      return false;
    }
  },

  updatePlaylistArtwork: (id, artworkUri) => {
    playlistRepository.updateArtwork(id, artworkUri);
    get().refreshPlaylists();
  },

  deletePlaylist: (id) => {
    playlistRepository.delete(id);
    get().refreshPlaylists();
  },

  getPlaylistSongs: (playlistId) => {
    return playlistRepository.getSongs(playlistId);
  },

  addSongsToPlaylist: (playlistId, songIds) => {
    playlistRepository.addSongs(playlistId, songIds);
    get().refreshPlaylists();
  },

  removeSongFromPlaylist: (playlistId, songId) => {
    playlistRepository.removeSong(playlistId, songId);
    get().refreshPlaylists();
  },

  reorderPlaylistSongs: (playlistId, orderedSongIds) => {
    playlistRepository.reorderSongs(playlistId, orderedSongIds);
    get().refreshPlaylists();
  },

  clearError: () => set({ error: null }),
}));
