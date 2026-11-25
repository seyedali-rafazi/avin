import { create } from 'zustand';
import { audioEngine } from '@/services/audio/audioEngine';

export type SleepTimerMode = 'off' | 'duration' | 'end-of-track';

interface SleepTimerState {
  mode: SleepTimerMode;
  remainingSeconds: number;
  fadeOutEnabled: boolean;

  startTimer: (minutes: number) => void;
  startEndOfTrack: () => void;
  setFadeOutEnabled: (enabled: boolean) => void;
  cancelTimer: () => void;
  /**
   * Called when a track finishes. Returns true if playback should stop now.
   */
  consumeEndOfTrackIfActive: () => boolean;
}

const FADE_OUT_WINDOW_SECONDS = 10;

let intervalId: ReturnType<typeof setInterval> | null = null;
let pauseHandler: (() => void) | null = null;

export function registerSleepTimerPauseHandler(handler: () => void): void {
  pauseHandler = handler;
}

function clearIntervalSafe(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  mode: 'off',
  remainingSeconds: 0,
  fadeOutEnabled: true,

  startTimer: (minutes) => {
    clearIntervalSafe();
    audioEngine.setFadeMultiplier(1.0);
    const totalSeconds = Math.max(1, Math.round(minutes * 60));

    set({ mode: 'duration', remainingSeconds: totalSeconds });

    intervalId = setInterval(() => {
      const state = get();
      if (state.mode !== 'duration') {
        clearIntervalSafe();
        return;
      }

      const next = state.remainingSeconds - 1;
      if (next <= 0) {
        clearIntervalSafe();
        pauseHandler?.();
        audioEngine.setFadeMultiplier(1.0);
        set({ mode: 'off', remainingSeconds: 0 });
        return;
      }

      // Smooth fade-out during the final 10 seconds
      if (state.fadeOutEnabled && next <= FADE_OUT_WINDOW_SECONDS) {
        audioEngine.setFadeMultiplier(next / FADE_OUT_WINDOW_SECONDS);
      }

      set({ remainingSeconds: next });
    }, 1000);
  },

  startEndOfTrack: () => {
    clearIntervalSafe();
    audioEngine.setFadeMultiplier(1.0);
    set({ mode: 'end-of-track', remainingSeconds: 0 });
  },

  setFadeOutEnabled: (fadeOutEnabled) => {
    set({ fadeOutEnabled });
    if (!fadeOutEnabled) {
      audioEngine.setFadeMultiplier(1.0);
    }
  },

  cancelTimer: () => {
    clearIntervalSafe();
    audioEngine.setFadeMultiplier(1.0);
    set({ mode: 'off', remainingSeconds: 0 });
  },

  consumeEndOfTrackIfActive: () => {
    if (get().mode === 'end-of-track') {
      clearIntervalSafe();
      audioEngine.setFadeMultiplier(1.0);
      set({ mode: 'off', remainingSeconds: 0 });
      return true;
    }
    return false;
  },
}));
