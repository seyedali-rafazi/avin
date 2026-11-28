import type { Song } from '@/types/music';

interface MockPlaylist {
  sources: { uri?: string; name?: string }[];
  currentIndex: number;
  trackCount: number;
  isLoaded: boolean;
  isBuffering: boolean;
  playing: boolean;
  volume: number;
  playbackRate: number;
  loop: string;
  addListener: jest.Mock;
  skipTo: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  add: jest.Mock;
  insert: jest.Mock;
  remove: jest.Mock;
  clear: jest.Mock;
  seekTo: jest.Mock;
  setActiveForLockScreen: jest.Mock;
  updateLockScreenMetadata: jest.Mock;
  clearLockScreenControls: jest.Mock;
  destroy: jest.Mock;
  release: jest.Mock;
}

const createdPlaylists: MockPlaylist[] = [];
let appStateHandler: ((state: string) => void) | null = null;

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_type: string, handler: (state: string) => void) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  clearAllPreloadedSources: jest.fn().mockResolvedValue(undefined),
  createAudioPlaylist: jest.fn(({ sources = [], loop = 'none' }) => {
    const items = [...sources];
    const mock: MockPlaylist = {
      sources: items,
      currentIndex: 0,
      get trackCount() {
        return items.length;
      },
      isLoaded: true,
      isBuffering: false,
      playing: false,
      volume: 1,
      playbackRate: 1,
      loop,
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      skipTo: jest.fn((idx: number) => {
        mock.currentIndex = idx;
      }),
      play: jest.fn(() => {
        mock.playing = true;
      }),
      pause: jest.fn(() => {
        mock.playing = false;
      }),
      add: jest.fn((src: { uri?: string; name?: string }) => {
        items.push(src);
      }),
      insert: jest.fn((src: { uri?: string; name?: string }, idx: number) => {
        items.splice(idx, 0, src);
        if (idx <= mock.currentIndex) mock.currentIndex += 1;
      }),
      remove: jest.fn((idx: number) => {
        items.splice(idx, 1);
        if (idx < mock.currentIndex) mock.currentIndex -= 1;
      }),
      clear: jest.fn(() => {
        items.length = 0;
        mock.currentIndex = 0;
        mock.playing = false;
      }),
      seekTo: jest.fn().mockResolvedValue(undefined),
      setActiveForLockScreen: jest.fn(),
      updateLockScreenMetadata: jest.fn(),
      clearLockScreenControls: jest.fn(),
      destroy: jest.fn(),
      release: jest.fn(),
    };
    createdPlaylists.push(mock);
    return mock;
  }),
}));

import { audioEngine } from '@/services/audio/audioEngine';

function makeSong(n: number): Song {
  return {
    id: `song-${n}`,
    title: `Song ${n}`,
    artist: `Artist ${n}`,
    album: `Album ${n}`,
    albumId: `alb-${n}`,
    genre: 'Pop',
    folder: 'Music',
    duration: 200,
    fileUri: `file:///music/song-${n}.mp3`,
    artworkUri: null,
    fileSize: 3_000_000,
    dateAdded: n * 1000,
    playCount: 0,
    lastPlayedAt: null,
  };
}

const library = Array.from({ length: 40 }, (_, i) => makeSong(i));

describe('AudioEngine crash safety & playlist reuse', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    audioEngine.destroy();
    createdPlaylists.length = 0;
  });

  afterEach(() => {
    audioEngine.destroy();
    jest.useRealTimers();
  });

  test('reuses the same AudioPlaylist when switching from song 1 to song 2 without calling release()', async () => {
    await audioEngine.setQueueAndPlay(library, 0, true);
    expect(createdPlaylists).toHaveLength(1);
    const pl = createdPlaylists[0]!;
    expect(pl.setActiveForLockScreen).toHaveBeenCalledTimes(1);
    expect(pl.play).toHaveBeenCalledTimes(1);

    // Let deferred window fill populate surrounding tracks
    jest.advanceTimersByTime(300);
    expect(pl.trackCount).toBeGreaterThan(1);

    // Select next song in the same queue
    await audioEngine.setQueueAndPlay(library, 1, true);
    expect(createdPlaylists).toHaveLength(1);
    expect(pl.skipTo).toHaveBeenCalledWith(1);
    expect(pl.setActiveForLockScreen).toHaveBeenCalledTimes(1);
    expect(pl.updateLockScreenMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Song 1' })
    );
    expect(pl.release).not.toHaveBeenCalled();
  });

  test('swaps active track in-place when jumping far out of window or to a different queue', async () => {
    await audioEngine.setQueueAndPlay(library, 0, true);
    const pl = createdPlaylists[0]!;

    // Immediately pick song #35 (outside window, before window fill timer even fires)
    await audioEngine.setQueueAndPlay(library, 35, true);
    expect(createdPlaylists).toHaveLength(1);
    expect(pl.trackCount).toBe(1);
    expect(pl.sources[0]?.uri).toBe('file:///music/song-35.mp3');
    expect(pl.setActiveForLockScreen).toHaveBeenCalledTimes(1);
    expect(pl.release).not.toHaveBeenCalled();

    // Switch to a completely different queue (e.g. Favorites / Search)
    const otherQueue = [makeSong(99), makeSong(100)];
    await audioEngine.setQueueAndPlay(otherQueue, 0, true);
    expect(createdPlaylists).toHaveLength(1);
    expect(pl.sources[0]?.uri).toBe('file:///music/song-99.mp3');
    expect(pl.release).not.toHaveBeenCalled();
  });

  test('rebuilds cleanly without calling release() after background pause & notification dismiss', async () => {
    await audioEngine.setQueueAndPlay(library, 0, true);
    const firstPl = createdPlaylists[0]!;
    audioEngine.pause();

    // Simulate user leaving app while paused, then coming back
    appStateHandler?.('background');
    appStateHandler?.('active');

    const loadPromise = audioEngine.setQueueAndPlay(library, 5, true);
    await jest.advanceTimersByTimeAsync(100);
    await loadPromise;

    expect(createdPlaylists).toHaveLength(2);
    expect(firstPl.destroy).toHaveBeenCalledTimes(1);
    expect(firstPl.release).not.toHaveBeenCalled();
    expect(createdPlaylists[1]!.sources[0]?.uri).toBe('file:///music/song-5.mp3');
    expect(createdPlaylists[1]!.play).toHaveBeenCalledTimes(1);
  });
});
