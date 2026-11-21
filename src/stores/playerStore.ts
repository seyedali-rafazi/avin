import { create } from 'zustand';
import { audioEngine } from '@/services/audio/audioEngine';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { RepeatMode, Song } from '@/types/music';
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
  playQueue: (songs: Song[], startIndex?: number, forceShuffle?: boolean) => Promise<void>;
  playSongAtIndex: (index: number) => Promise<void>;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  nextTrack: (isAutomatic?: boolean) => Promise<void>;
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
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  shuffleCurrentQueue: () => void;
  clearQueue: () => Promise<void>;
  clearError: () => void;
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

  initializePlayer: () => {
    if (get().isInitialized) return;

    const { settings } = useSettingsStore.getState();
    set({
      shuffle: settings.shuffleByDefault,
      repeatMode: settings.defaultRepeatMode,
      playbackRate: settings.defaultPlaybackSpeed,
      isInitialized: true,
    });

    audioEngine.setPlaybackRate(settings.defaultPlaybackSpeed);
    audioEngine.setLoopCurrent(settings.defaultRepeatMode === 'one');

    audioEngine.setCallbacks({
      onStatusUpdate: (status) => {
        const current = get().currentSong;
        set({
          isPlaying: status.isPlaying,
          isBuffering: status.isBuffering,
          position: status.position,
          duration: status.duration > 0 ? status.duration : current?.duration ?? 0,
        });
      },
      onTrackFinished: () => {
        void get().nextTrack(true);
      },
      onError: (message) => {
        set({ error: message, isPlaying: false, isBuffering: false });
      },
    });
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
    await audioEngine.loadAndPlay(activeSong, true);
  },

  playSongAtIndex: async (index) => {
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
    await audioEngine.loadAndPlay(song, true);
  },

  togglePlayPause: () => {
    const { currentSong, isPlaying } = get();
    if (!currentSong) return;
    if (isPlaying) {
      audioEngine.pause();
      set({ isPlaying: false });
    } else {
      audioEngine.play();
      set({ isPlaying: true });
    }
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false });
  },

  resume: () => {
    if (!get().currentSong) return;
    audioEngine.play();
    set({ isPlaying: true });
  },

  stop: async () => {
    await audioEngine.stop();
    set({ isPlaying: false, position: 0 });
  },

  nextTrack: async (isAutomatic = false) => {
    const { currentIndex, queue, repeatMode } = get();
    const nextIdx = getNextIndex(currentIndex, queue.length, repeatMode, isAutomatic);
    if (nextIdx === null) {
      set({ isPlaying: false });
      return;
    }
    await get().playSongAtIndex(nextIdx);
  },

  previousTrack: async () => {
    const { position, currentIndex, queue, repeatMode } = get();
    if (position > 3) {
      await get().seekTo(0);
      return;
    }
    const prevIdx = getPreviousIndex(currentIndex, queue.length, repeatMode);
    if (prevIdx === null) return;
    await get().playSongAtIndex(prevIdx);
  },

  seekTo: async (seconds) => {
    const { duration } = get();
    const clamped = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
    set({ position: clamped });
    await audioEngine.seekTo(clamped);
  },

  toggleShuffle: () => {
    const { shuffle, originalQueue, queue, currentSong } = get();
    const nextShuffle = !shuffle;

    if (queue.length <= 1) {
      set({ shuffle: nextShuffle });
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
  },

  cycleRepeat: () => {
    const next = cycleRepeatMode(get().repeatMode);
    audioEngine.setLoopCurrent(next === 'one');
    set({ repeatMode: next });
  },

  setRepeatMode: (mode) => {
    audioEngine.setLoopCurrent(mode === 'one');
    set({ repeatMode: mode });
  },

  setPlaybackRate: (rate) => {
    const clamped = Math.min(2.0, Math.max(0.5, rate));
    audioEngine.setPlaybackRate(clamped);
    set({ playbackRate: clamped });
  },

  setVolume: (volume) => {
    const clamped = Math.min(1.0, Math.max(0.0, volume));
    audioEngine.setVolume(clamped);
    set({ volume: clamped });
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
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, currentSong } = get();
    const reordered = reorderList(queue, fromIndex, toIndex);
    const nextIndex = currentSong ? reordered.findIndex((s) => s.id === currentSong.id) : -1;
    set({ queue: reordered, currentIndex: nextIndex });
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
  },

  clearError: () => set({ error: null }),
}));
