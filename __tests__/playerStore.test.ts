jest.mock('@/services/audio/audioEngine', () => ({
  audioEngine: {
    setCallbacks: jest.fn(),
    loadAndPlay: jest.fn().mockResolvedValue(undefined),
    crossfadeTo: jest.fn().mockResolvedValue(undefined),
    preloadNextTrack: jest.fn().mockResolvedValue(undefined),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    setPlaybackRate: jest.fn(),
    setVolume: jest.fn(),
    setFadeMultiplier: jest.fn(),
    setEqGainMultiplier: jest.fn(),
    setLoopCurrent: jest.fn(),
    setGaplessPlayback: jest.fn(),
    setCrossfadeSeconds: jest.fn(),
    updateMetadata: jest.fn(),
  },
}));

jest.mock('@/database/repositories', () => ({
  settingsRepository: {
    getPersistedPlaybackState: jest.fn(() => null),
    savePersistedPlaybackState: jest.fn(),
  },
  songRepository: {
    getByIds: jest.fn(() => []),
  },
}));

jest.mock('@/stores/libraryStore', () => ({
  useLibraryStore: {
    getState: () => ({
      recordSongPlayed: jest.fn(),
    }),
  },
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: {
        theme: 'dark',
        useSystemTheme: false,
        accentColor: '#913DFF',
        defaultRepeatMode: 'off',
        shuffleByDefault: false,
        defaultPlaybackSpeed: 1.0,
        gaplessPlayback: false,
      },
    }),
  },
}));

import { audioEngine } from '@/services/audio/audioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import type { Song } from '@/types/music';

const mockSongs: Song[] = [
  {
    id: 's1',
    title: 'Track One',
    artist: 'Artist A',
    album: 'Album A',
    albumId: 'alb1',
    genre: 'Pop',
    folder: 'Music',
    duration: 180,
    fileUri: 'file:///s1.mp3',
    artworkUri: null,
    fileSize: 3000000,
    dateAdded: 1000,
    playCount: 0,
    lastPlayedAt: null,
  },
  {
    id: 's2',
    title: 'Track Two',
    artist: 'Artist B',
    album: 'Album B',
    albumId: 'alb2',
    genre: 'Rock',
    folder: 'Music',
    duration: 210,
    fileUri: 'file:///s2.mp3',
    artworkUri: null,
    fileSize: 3500000,
    dateAdded: 2000,
    playCount: 0,
    lastPlayedAt: null,
  },
  {
    id: 's3',
    title: 'Track Three',
    artist: 'Artist C',
    album: 'Album C',
    albumId: 'alb3',
    genre: 'Jazz',
    folder: 'Music',
    duration: 240,
    fileUri: 'file:///s3.mp3',
    artworkUri: null,
    fileSize: 4000000,
    dateAdded: 3000,
    playCount: 0,
    lastPlayedAt: null,
  },
];

describe('usePlayerStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await usePlayerStore.getState().clearQueue();
    usePlayerStore.setState({ repeatMode: 'off', shuffle: false, playbackRate: 1.0 });
  });

  test('plays queue starting at specified index', async () => {
    await usePlayerStore.getState().playQueue(mockSongs, 1, false);
    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.currentSong?.id).toBe('s2');
    expect(audioEngine.loadAndPlay).toHaveBeenCalledWith(mockSongs[1], true);
  });

  test('advances to next track and wraps on repeat all', async () => {
    await usePlayerStore.getState().playQueue(mockSongs, 2, false);
    usePlayerStore.getState().setRepeatMode('all');
    await usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentSong?.id).toBe('s1');
  });

  test('playNext inserts song immediately after current track', async () => {
    await usePlayerStore.getState().playQueue([mockSongs[0]!, mockSongs[2]!], 0, false);
    usePlayerStore.getState().playNext(mockSongs[1]!);
    expect(usePlayerStore.getState().queue.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  test('reorderQueue updates queue order and preserves currentSong index', async () => {
    await usePlayerStore.getState().playQueue(mockSongs, 0, false);
    usePlayerStore.getState().reorderQueue(0, 2);
    const state = usePlayerStore.getState();
    expect(state.queue.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
    expect(state.currentIndex).toBe(2);
    expect(state.currentSong?.id).toBe('s1');
  });

  test('removeFromQueue adjusts currentIndex cleanly', async () => {
    await usePlayerStore.getState().playQueue(mockSongs, 2, false);
    usePlayerStore.getState().removeFromQueue(0);
    const state = usePlayerStore.getState();
    expect(state.queue.map((s) => s.id)).toEqual(['s2', 's3']);
    expect(state.currentIndex).toBe(1);
  });

  test('clamps playback rate between 0.5 and 2.0', () => {
    usePlayerStore.getState().setPlaybackRate(3.0);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);
    usePlayerStore.getState().setPlaybackRate(0.1);
    expect(usePlayerStore.getState().playbackRate).toBe(0.5);
  });
});
