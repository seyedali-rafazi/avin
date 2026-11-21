import { create } from 'zustand';
import { settingsRepository } from '@/database/repositories';
import { DEFAULT_SETTINGS, type AppSettings, type RepeatMode, type ThemeMode } from '@/types/music';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => void;
  setTheme: (theme: ThemeMode) => void;
  setUseSystemTheme: (enabled: boolean) => void;
  setAccentColor: (color: string) => void;
  setDefaultRepeatMode: (mode: RepeatMode) => void;
  setShuffleByDefault: (enabled: boolean) => void;
  setDefaultPlaybackSpeed: (speed: number) => void;
  setGaplessPlayback: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: () => {
    try {
      const loaded = settingsRepository.getAll();
      set({ settings: loaded, loaded: true });
    } catch {
      set({ settings: DEFAULT_SETTINGS, loaded: true });
    }
  },

  setTheme: (theme) => {
    settingsRepository.set('theme', theme);
    set((s) => ({ settings: { ...s.settings, theme } }));
  },

  setUseSystemTheme: (useSystemTheme) => {
    settingsRepository.set('useSystemTheme', useSystemTheme);
    set((s) => ({ settings: { ...s.settings, useSystemTheme } }));
  },

  setAccentColor: (accentColor) => {
    settingsRepository.set('accentColor', accentColor);
    set((s) => ({ settings: { ...s.settings, accentColor } }));
  },

  setDefaultRepeatMode: (defaultRepeatMode) => {
    settingsRepository.set('defaultRepeatMode', defaultRepeatMode);
    set((s) => ({ settings: { ...s.settings, defaultRepeatMode } }));
  },

  setShuffleByDefault: (shuffleByDefault) => {
    settingsRepository.set('shuffleByDefault', shuffleByDefault);
    set((s) => ({ settings: { ...s.settings, shuffleByDefault } }));
  },

  setDefaultPlaybackSpeed: (defaultPlaybackSpeed) => {
    settingsRepository.set('defaultPlaybackSpeed', defaultPlaybackSpeed);
    set((s) => ({ settings: { ...s.settings, defaultPlaybackSpeed } }));
  },

  setGaplessPlayback: (gaplessPlayback) => {
    settingsRepository.set('gaplessPlayback', gaplessPlayback);
    set((s) => ({ settings: { ...s.settings, gaplessPlayback } }));
  },
}));
