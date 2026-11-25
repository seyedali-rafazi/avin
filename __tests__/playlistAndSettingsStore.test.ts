const mockPlaylists: {
  id: string;
  name: string;
  artworkUri: string | null;
  createdAt: number;
  updatedAt: number;
  songCount: number;
}[] = [];

jest.mock('@/services/audio/audioEngine', () => ({
  audioEngine: {
    setGaplessPlayback: jest.fn(),
    setCrossfadeSeconds: jest.fn(),
    setEqGainMultiplier: jest.fn(),
  },
}));

jest.mock('@/database/repositories', () => ({
  playlistRepository: {
    getAll: jest.fn(() => [...mockPlaylists]),
    create: jest.fn((name: string) => {
      const pl = {
        id: `pl_${mockPlaylists.length + 1}`,
        name,
        artworkUri: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        songCount: 0,
      };
      mockPlaylists.push(pl);
      return pl;
    }),
    rename: jest.fn((id: string, name: string) => {
      const found = mockPlaylists.find((p) => p.id === id);
      if (found) found.name = name;
    }),
    updateArtwork: jest.fn(),
    delete: jest.fn((id: string) => {
      const idx = mockPlaylists.findIndex((p) => p.id === id);
      if (idx >= 0) mockPlaylists.splice(idx, 1);
    }),
    getSongs: jest.fn(() => []),
    addSongs: jest.fn(),
    removeSong: jest.fn(),
    reorderSongs: jest.fn(),
  },
  settingsRepository: {
    getAll: jest.fn(() => ({
      theme: 'dark',
      useSystemTheme: false,
      accentColor: '#913DFF',
      defaultRepeatMode: 'off',
      shuffleByDefault: false,
      defaultPlaybackSpeed: 1.0,
      gaplessPlayback: true,
      crossfadeSeconds: 0,
      minSongDuration: 15,
      excludedFolders: [],
      pauseOnAudioRouteChange: true,
      equalizerEnabled: false,
      equalizerPreset: 'flat',
      equalizerBands: [0, 0, 0, 0, 0],
      bassBoost: false,
    })),
    set: jest.fn(),
    setMany: jest.fn(),
  },
}));

import { usePlaylistStore } from '@/stores/playlistStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { PlaylistNameSchema } from '@/types/music';

describe('usePlaylistStore', () => {
  beforeEach(() => {
    mockPlaylists.length = 0;
    usePlaylistStore.setState({ playlists: [], error: null });
  });

  test('creates, renames, and deletes playlists', () => {
    const created = usePlaylistStore.getState().createPlaylist('Workout Mix');
    expect(created?.name).toBe('Workout Mix');
    expect(usePlaylistStore.getState().playlists).toHaveLength(1);

    usePlaylistStore.getState().renamePlaylist(created!.id, 'Evening Chill');
    expect(usePlaylistStore.getState().playlists[0]?.name).toBe('Evening Chill');

    usePlaylistStore.getState().deletePlaylist(created!.id);
    expect(usePlaylistStore.getState().playlists).toHaveLength(0);
  });

  test('validates playlist names with Zod', () => {
    expect(PlaylistNameSchema.safeParse('  Road Trip  ').success).toBe(true);
    expect(PlaylistNameSchema.safeParse('   ').success).toBe(false);
    expect(PlaylistNameSchema.safeParse('a'.repeat(61)).success).toBe(false);
  });
});

describe('useSettingsStore', () => {
  test('loads and updates playback settings', () => {
    useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings.theme).toBe('dark');

    useSettingsStore.getState().setShuffleByDefault(true);
    expect(useSettingsStore.getState().settings.shuffleByDefault).toBe(true);

    useSettingsStore.getState().setDefaultRepeatMode('all');
    expect(useSettingsStore.getState().settings.defaultRepeatMode).toBe('all');

    useSettingsStore.getState().setDefaultPlaybackSpeed(1.25);
    expect(useSettingsStore.getState().settings.defaultPlaybackSpeed).toBe(1.25);
  });
});
