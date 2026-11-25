import { create } from 'zustand';
import { settingsRepository } from '@/database/repositories';
import { audioEngine } from '@/services/audio/audioEngine';
import {
  computeEffectiveVolumeMultiplier,
  getPresetBands,
} from '@/services/audio/equalizerService';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type EqualizerPresetId,
  type RepeatMode,
  type ThemeMode,
} from '@/types/music';

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
  setCrossfadeSeconds: (seconds: number) => void;
  setMinSongDuration: (seconds: number) => void;
  setExcludedFolders: (folders: string[]) => void;
  addExcludedFolder: (folder: string) => void;
  removeExcludedFolder: (folder: string) => void;
  setPauseOnAudioRouteChange: (enabled: boolean) => void;
  setEqualizerEnabled: (enabled: boolean) => void;
  setEqualizerPreset: (preset: EqualizerPresetId) => void;
  setEqualizerBand: (index: number, db: number) => void;
  setBassBoost: (enabled: boolean) => void;
}

function syncAudioEngineSettings(settings: AppSettings): void {
  audioEngine.setGaplessPlayback(settings.gaplessPlayback);
  audioEngine.setCrossfadeSeconds(settings.crossfadeSeconds);
  audioEngine.setEqGainMultiplier(
    computeEffectiveVolumeMultiplier(
      settings.equalizerEnabled,
      settings.equalizerBands,
      settings.bassBoost
    )
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: () => {
    try {
      const loaded = settingsRepository.getAll();
      set({ settings: loaded, loaded: true });
      syncAudioEngineSettings(loaded);
    } catch {
      set({ settings: DEFAULT_SETTINGS, loaded: true });
      syncAudioEngineSettings(DEFAULT_SETTINGS);
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
    audioEngine.setGaplessPlayback(gaplessPlayback);
    set((s) => ({ settings: { ...s.settings, gaplessPlayback } }));
  },

  setCrossfadeSeconds: (rawSeconds) => {
    const crossfadeSeconds = Math.max(0, Math.min(12, Math.round(rawSeconds)));
    settingsRepository.set('crossfadeSeconds', crossfadeSeconds);
    audioEngine.setCrossfadeSeconds(crossfadeSeconds);
    set((s) => ({ settings: { ...s.settings, crossfadeSeconds } }));
  },

  setMinSongDuration: (rawSeconds) => {
    const minSongDuration = Math.max(0, Math.min(300, Math.round(rawSeconds)));
    settingsRepository.set('minSongDuration', minSongDuration);
    set((s) => ({ settings: { ...s.settings, minSongDuration } }));
  },

  setExcludedFolders: (excludedFolders) => {
    settingsRepository.set('excludedFolders', excludedFolders);
    set((s) => ({ settings: { ...s.settings, excludedFolders } }));
  },

  addExcludedFolder: (folder) => {
    const trimmed = folder.trim();
    if (!trimmed) return;
    const current = get().settings.excludedFolders;
    if (current.some((f) => f.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...current, trimmed];
    settingsRepository.set('excludedFolders', next);
    set((s) => ({ settings: { ...s.settings, excludedFolders: next } }));
  },

  removeExcludedFolder: (folder) => {
    const next = get().settings.excludedFolders.filter((f) => f !== folder);
    settingsRepository.set('excludedFolders', next);
    set((s) => ({ settings: { ...s.settings, excludedFolders: next } }));
  },

  setPauseOnAudioRouteChange: (pauseOnAudioRouteChange) => {
    settingsRepository.set('pauseOnAudioRouteChange', pauseOnAudioRouteChange);
    set((s) => ({ settings: { ...s.settings, pauseOnAudioRouteChange } }));
  },

  setEqualizerEnabled: (equalizerEnabled) => {
    settingsRepository.set('equalizerEnabled', equalizerEnabled);
    set((s) => {
      const next = { ...s.settings, equalizerEnabled };
      syncAudioEngineSettings(next);
      return { settings: next };
    });
  },

  setEqualizerPreset: (equalizerPreset) => {
    const bands =
      equalizerPreset === 'custom'
        ? get().settings.equalizerBands
        : getPresetBands(equalizerPreset);
    settingsRepository.setMany({ equalizerPreset, equalizerBands: bands });
    set((s) => {
      const next = { ...s.settings, equalizerPreset, equalizerBands: bands };
      syncAudioEngineSettings(next);
      return { settings: next };
    });
  },

  setEqualizerBand: (index, db) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(db)));
    const nextBands = [...get().settings.equalizerBands];
    if (index < 0 || index >= nextBands.length) return;
    nextBands[index] = clamped;
    settingsRepository.setMany({ equalizerPreset: 'custom', equalizerBands: nextBands });
    set((s) => {
      const next: AppSettings = {
        ...s.settings,
        equalizerPreset: 'custom',
        equalizerBands: nextBands,
      };
      syncAudioEngineSettings(next);
      return { settings: next };
    });
  },

  setBassBoost: (bassBoost) => {
    settingsRepository.set('bassBoost', bassBoost);
    set((s) => {
      const next = { ...s.settings, bassBoost };
      syncAudioEngineSettings(next);
      return { settings: next };
    });
  },
}));
