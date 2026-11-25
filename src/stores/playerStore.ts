import { create } from 'zustand';
import { settingsRepository, songRepository } from '@/database/repositories';
import { audioEngine } from '@/services/audio/audioEngine';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  registerSleepTimerPauseHandler,
  useSleepTimerStore,
} from '@/stores/sleepTimerStore';
import type { PersistedPlaybackState, RepeatMode, Song } from '@/types/music';
import {
  cycleRepeatMode,
  getNextIndex,
  getPreviousIndex,
  reorderList,
  shuffleSongs,
} from '@/utils/queue';

interface PlayerState {
  queue: Song[];
  originalQueue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  volume: number;
  error: string | null;
  isInitialized: boolean;

  initializePlayer: () => void;
  persistPlaybackState: () => void;
  playQueue: (songs: Song[], startIndex?: number, forceShuffle?: boolean) => Promise<void>;
  playSongAtIndex: (index: number, useCrossfade?: boolean) => Promise<void>;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  nextTrack: (isAutomatic?: boolean, useCrossfade?: boolean) => Promise<void>;
  previousTrack: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  removeSongById: (songId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  shuffleCurrentQueue: () => void;
  clearQueue: () => Promise<void>;
  syncUpdatedSong: (song: Song) => void;
  clearError: () => void;
}

let lastPersistTs = 0;

function preloadUpcomingTrack(state: Pick<PlayerState, 'queue' | 'currentIndex' | 'repeatMode'>): void {
  const { settings } = useSettingsStore.getState();
  if (!settings.gaplessPlayback) return;
  const nextIdx = getNextIndex(state.currentIndex, state.queue.length, state.repeatMode, true);
  const nextSong = nextIdx !== null ? state.queue[nextIdx] ?? null : null;
  void audioEngine.preloadNextTrack(nextSong);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeatMode: 'off',
  playbackRate: 1.0,
  volume: 1.0,
  error: null,
  isInitialized: false,

  persistPlaybackState: () => {
    try {
      const s = get();
      if (s.queue.length === 0 || s.currentIndex < 0) {
        settingsRepository.savePersistedPlaybackState(null);
        return;
      }
      const payload: PersistedPlaybackState = {
        queueIds: s.queue.map((item) => item.id),
        originalQueueIds: s.originalQueue.map((item) => item.id),
        currentIndex: s.currentIndex,
        position: Math.max(0, s.position),
        shuffle: s.shuffle,
        repeatMode: s.repeatMode,
        playbackRate: s.playbackRate,
        volume: s.volume,
      };
      settingsRepository.savePersistedPlaybackState(payload);
      lastPersistTs = Date.now();
    } catch {
      // Non-fatal persistence error (e.g. in mocked unit tests)
    }
  },

  initializePlayer: () => {
    if (get().isInitialized) return;

    const { settings } = useSettingsStore.getState();

    // Register sleep timer pause hook
    registerSleepTimerPauseHandler(() => {
      get().pause();
    });

    let restoredQueue: Song[] = [];
    let restoredOriginal: Song[] = [];
    let restoredIndex = -1;
    let restoredSong: Song | null = null;
    let restoredPosition = 0;
    let restoredShuffle = settings.shuffleByDefault;
    let restoredRepeat = settings.defaultRepeatMode;
    let restoredRate = settings.defaultPlaybackSpeed;
    let restoredVolume = 1.0;

    try {
      const persisted = settingsRepository.getPersistedPlaybackState();
      if (persisted && persisted.queueIds.length > 0) {
        const allNeededIds = Array.from(
          new Set([...persisted.queueIds, ...persisted.originalQueueIds])
        );
        const foundSongs = songRepository.getByIds(allNeededIds);
        const byId = new Map(foundSongs.map((song) => [song.id, song]));

        restoredQueue = persisted.queueIds
          .map((id) => byId.get(id))
          .filter((s): s is Song => Boolean(s));
        restoredOriginal = persisted.originalQueueIds
          .map((id) => byId.get(id))
          .filter((s): s is Song => Boolean(s));

        if (restoredQueue.length > 0) {
          restoredIndex = Math.max(
            0,
            Math.min(persisted.currentIndex, restoredQueue.length - 1)
          );
          restoredSong = restoredQueue[restoredIndex] ?? null;
          restoredPosition = Math.max(0, persisted.position || 0);
          restoredShuffle = persisted.shuffle;
          restoredRepeat = persisted.repeatMode;
          restoredRate = persisted.playbackRate || settings.defaultPlaybackSpeed;
          restoredVolume =
            typeof persisted.volume === 'number'
              ? Math.min(1, Math.max(0, persisted.volume))
              : 1.0;
        }
      }
    } catch {
      // Ignore restore errors in tests or clean DB
    }

    set({
      queue: restoredQueue,
      originalQueue: restoredOriginal.length > 0 ? restoredOriginal : restoredQueue,
      currentIndex: restoredIndex,
      currentSong: restoredSong,
      position: restoredPosition,
      duration: restoredSong?.duration ?? 0,
      shuffle: restoredShuffle,
      repeatMode: restoredRepeat,
      playbackRate: restoredRate,
      volume: restoredVolume,
      isInitialized: true,
    });

    audioEngine.setPlaybackRate(restoredRate);
    audioEngine.setVolume(restoredVolume);
    audioEngine.setLoopCurrent(restoredRepeat === 'one');
    audioEngine.setGaplessPlayback(settings.gaplessPlayback);
    audioEngine.setCrossfadeSeconds(settings.crossfadeSeconds);

    audioEngine.setCallbacks({
      onStatusUpdate: (status) => {
        const current = get().currentSong;
        set({
          isPlaying: status.isPlaying,
          isBuffering: status.isBuffering,
          position: status.position,
          duration: status.duration > 0 ? status.duration : current?.duration ?? 0,
        });

        const now = Date.now();
        if (current && now - lastPersistTs >= 5000) {
          get().persistPlaybackState();
        }
      },
      onTrackFinished: () => {
        if (useSleepTimerStore.getState().consumeEndOfTrackIfActive()) {
          get().pause();
          return;
        }
        void get().nextTrack(true, false);
      },
      onCrossfadeNeeded: () => {
        if (useSleepTimerStore.getState().mode === 'end-of-track') {
          return;
        }
        void get().nextTrack(true, true);
      },
      onExternalPause: () => {
        set({ isPlaying: false });
        get().persistPlaybackState();
      },
      onError: (message) => {
        set({ error: message, isPlaying: false, isBuffering: false });
      },
    });

    if (restoredSong) {
      void audioEngine.loadAndPlay(restoredSong, false, restoredPosition);
      preloadUpcomingTrack({
        queue: restoredQueue,
        currentIndex: restoredIndex,
        repeatMode: restoredRepeat,
      });
    }
  },

  playQueue: async (songs, startIndex = 0, forceShuffle) => {
    if (songs.length === 0) return;

    get().initializePlayer();

    const shouldShuffle = forceShuffle !== undefined ? forceShuffle : get().shuffle;
    const clampedStart = Math.max(0, Math.min(startIndex, songs.length - 1));
    const targetSong = songs[clampedStart]!;

    const finalQueue = shouldShuffle
      ? shuffleSongs(songs, forceShuffle ? undefined : targetSong.id)
      : [...songs];

    const newIndex = shouldShuffle
      ? forceShuffle
        ? 0
        : finalQueue.findIndex((s) => s.id === targetSong.id)
      : clampedStart;

    const activeSong = finalQueue[newIndex] ?? finalQueue[0]!;

    set({
      originalQueue: [...songs],
      queue: finalQueue,
      currentIndex: newIndex,
      currentSong: activeSong,
      shuffle: shouldShuffle,
      position: 0,
      duration: activeSong.duration,
      error: null,
    });

    useLibraryStore.getState().recordSongPlayed(activeSong.id);
    get().persistPlaybackState();
    await audioEngine.loadAndPlay(activeSong, true);
    preloadUpcomingTrack(get());
  },

  playSongAtIndex: async (index, useCrossfade = false) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const song = queue[index]!;

    set({
      currentIndex: index,
      currentSong: song,
      position: 0,
      duration: song.duration,
      error: null,
    });

    useLibraryStore.getState().recordSongPlayed(song.id);
    get().persistPlaybackState();

    const crossfadeSec = useSettingsStore.getState().settings.crossfadeSeconds;
    if (useCrossfade && crossfadeSec > 0) {
      await audioEngine.crossfadeTo(song, crossfadeSec);
    } else {
      await audioEngine.loadAndPlay(song, true);
    }
    preloadUpcomingTrack(get());
  },

  togglePlayPause: () => {
    const { currentSong, isPlaying } = get();
    if (!currentSong) return;
    if (isPlaying) {
      audioEngine.pause();
      set({ isPlaying: false });
      get().persistPlaybackState();
    } else {
      audioEngine.play();
      set({ isPlaying: true });
    }
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false });
    get().persistPlaybackState();
  },

  resume: () => {
    if (!get().currentSong) return;
    audioEngine.play();
    set({ isPlaying: true });
  },

  stop: async () => {
    await audioEngine.stop();
    set({ isPlaying: false, position: 0 });
    get().persistPlaybackState();
  },

  nextTrack: async (isAutomatic = false, useCrossfade = false) => {
    const { currentIndex, queue, repeatMode } = get();
    const nextIdx = getNextIndex(currentIndex, queue.length, repeatMode, isAutomatic);
    if (nextIdx === null) {
      set({ isPlaying: false });
      get().persistPlaybackState();
      return;
    }
    await get().playSongAtIndex(nextIdx, useCrossfade);
  },

  previousTrack: async () => {
    const { position, currentIndex, queue, repeatMode } = get();
    if (position > 3) {
      await get().seekTo(0);
      return;
    }
    const prevIdx = getPreviousIndex(currentIndex, queue.length, repeatMode);
    if (prevIdx === null) return;
    await get().playSongAtIndex(prevIdx, false);
  },

  seekTo: async (seconds) => {
    const { duration } = get();
    const clamped = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
    set({ position: clamped });
    await audioEngine.seekTo(clamped);
    get().persistPlaybackState();
  },

  toggleShuffle: () => {
    const { shuffle, originalQueue, queue, currentSong } = get();
    const nextShuffle = !shuffle;

    if (queue.length <= 1) {
      set({ shuffle: nextShuffle });
      get().persistPlaybackState();
      return;
    }

    if (nextShuffle) {
      const shuffled = shuffleSongs(queue, currentSong?.id);
      const nextIndex = currentSong ? shuffled.findIndex((s) => s.id === currentSong.id) : 0;
      set({
        shuffle: true,
        queue: shuffled,
        currentIndex: nextIndex >= 0 ? nextIndex : 0,
      });
    } else {
      const restored = originalQueue.length > 0 ? [...originalQueue] : [...queue];
      const nextIndex = currentSong ? restored.findIndex((s) => s.id === currentSong.id) : 0;
      set({
        shuffle: false,
        queue: restored,
        currentIndex: nextIndex >= 0 ? nextIndex : 0,
      });
    }
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  cycleRepeat: () => {
    const next = cycleRepeatMode(get().repeatMode);
    audioEngine.setLoopCurrent(next === 'one');
    set({ repeatMode: next });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  setRepeatMode: (mode) => {
    audioEngine.setLoopCurrent(mode === 'one');
    set({ repeatMode: mode });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  setPlaybackRate: (rate) => {
    const clamped = Math.min(2.0, Math.max(0.5, rate));
    audioEngine.setPlaybackRate(clamped);
    set({ playbackRate: clamped });
    get().persistPlaybackState();
  },

  setVolume: (volume) => {
    const clamped = Math.min(1.0, Math.max(0.0, volume));
    audioEngine.setVolume(clamped);
    set({ volume: clamped });
    get().persistPlaybackState();
  },

  addToQueue: (song) => {
    const { queue, originalQueue } = get();
    if (queue.length === 0) {
      void get().playQueue([song], 0, false);
      return;
    }
    set({
      queue: [...queue, song],
      originalQueue: [...originalQueue, song],
    });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  playNext: (song) => {
    const { queue, originalQueue, currentIndex } = get();
    if (queue.length === 0 || currentIndex < 0) {
      void get().playQueue([song], 0, false);
      return;
    }
    const insertIdx = currentIndex + 1;
    const nextQueue = [...queue];
    nextQueue.splice(insertIdx, 0, song);
    set({
      queue: nextQueue,
      originalQueue: [...originalQueue, song],
    });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    if (index < 0 || index >= queue.length) return;

    const nextQueue = queue.filter((_, i) => i !== index);
    if (nextQueue.length === 0) {
      void get().clearQueue();
      return;
    }

    if (index === currentIndex) {
      const nextIndex = Math.min(index, nextQueue.length - 1);
      const nextSong = nextQueue[nextIndex]!;
      set({ queue: nextQueue, currentIndex: nextIndex, currentSong: nextSong });
      void audioEngine.loadAndPlay(nextSong, get().isPlaying);
    } else if (index < currentIndex) {
      set({ queue: nextQueue, currentIndex: currentIndex - 1 });
    } else {
      set({ queue: nextQueue });
    }
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  removeSongById: (songId) => {
    const { queue, originalQueue, currentIndex } = get();
    const idx = queue.findIndex((s) => s.id === songId);
    const nextOriginal = originalQueue.filter((s) => s.id !== songId);
    set({ originalQueue: nextOriginal });
    if (idx >= 0) {
      get().removeFromQueue(idx);
    } else if (currentIndex >= 0) {
      get().persistPlaybackState();
    }
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, currentSong } = get();
    const reordered = reorderList(queue, fromIndex, toIndex);
    const nextIndex = currentSong ? reordered.findIndex((s) => s.id === currentSong.id) : -1;
    set({ queue: reordered, currentIndex: nextIndex });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  shuffleCurrentQueue: () => {
    const { queue, currentSong } = get();
    if (queue.length <= 1) return;
    const shuffled = shuffleSongs(queue, currentSong?.id);
    const nextIndex = currentSong ? shuffled.findIndex((s) => s.id === currentSong.id) : 0;
    set({
      shuffle: true,
      queue: shuffled,
      currentIndex: nextIndex >= 0 ? nextIndex : 0,
    });
    get().persistPlaybackState();
    preloadUpcomingTrack(get());
  },

  clearQueue: async () => {
    await audioEngine.stop();
    set({
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      currentSong: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
    });
    get().persistPlaybackState();
  },

  syncUpdatedSong: (updatedSong) => {
    const { queue, originalQueue, currentSong } = get();
    const nextQueue = queue.map((s) => (s.id === updatedSong.id ? updatedSong : s));
    const nextOriginal = originalQueue.map((s) => (s.id === updatedSong.id ? updatedSong : s));
    const isCurrent = currentSong?.id === updatedSong.id;

    set({
      queue: nextQueue,
      originalQueue: nextOriginal,
      currentSong: isCurrent ? updatedSong : currentSong,
    });

    if (isCurrent) {
      audioEngine.updateMetadata(updatedSong);
    }
  },

  clearError: () => set({ error: null }),
}));
