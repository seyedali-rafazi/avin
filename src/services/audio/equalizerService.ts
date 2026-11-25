import type { EqualizerPresetId } from '@/types/music';

export interface EqualizerBandMeta {
  index: number;
  freqLabel: string;
  hz: number;
}

export interface EqualizerPreset {
  id: EqualizerPresetId;
  label: string;
  bands: [number, number, number, number, number]; // dB in [-12, 12]
}

export const EQUALIZER_BANDS: EqualizerBandMeta[] = [
  { index: 0, freqLabel: '60Hz', hz: 60 },
  { index: 1, freqLabel: '230Hz', hz: 230 },
  { index: 2, freqLabel: '910Hz', hz: 910 },
  { index: 3, freqLabel: '3.6kHz', hz: 3600 },
  { index: 4, freqLabel: '14kHz', hz: 14000 },
];

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { id: 'flat', label: 'عادی', bands: [0, 0, 0, 0, 0] },
  { id: 'pop', label: 'پاپ', bands: [-1, 3, 4, 2, -1] },
  { id: 'rock', label: 'راک', bands: [5, 2, -1, 3, 5] },
  { id: 'bass-boost', label: 'باس قوی', bands: [8, 5, 1, 0, 0] },
  { id: 'vocal', label: 'وکال', bands: [-2, 1, 5, 4, 1] },
  { id: 'classical', label: 'کلاسیک', bands: [4, 2, 0, 2, 4] },
  { id: 'electronic', label: 'الکترونیک', bands: [6, 3, 0, 3, 6] },
  { id: 'custom', label: 'سفارشی', bands: [0, 0, 0, 0, 0] },
];

export function getPresetBands(presetId: EqualizerPresetId): number[] {
  const found = EQUALIZER_PRESETS.find((p) => p.id === presetId);
  return found ? [...found.bands] : [0, 0, 0, 0, 0];
}

/**
 * Computes a gentle perceptual gain multiplier (0.75..1.0) from EQ bands and bass boost
 * so loudness stays balanced when EQ is enabled.
 */
export function computeEffectiveVolumeMultiplier(
  enabled: boolean,
  bands: number[],
  bassBoost: boolean
): number {
  if (!enabled) return 1.0;
  const avgDb =
    bands.length > 0
      ? bands.reduce((sum, b) => sum + b, 0) / bands.length
      : 0;
  const boostDb = bassBoost ? 1.5 : 0;
  const netDb = Math.max(-6, Math.min(6, (avgDb + boostDb) * 0.25));
  return Math.min(1.0, Math.max(0.7, Math.pow(10, netDb / 20)));
}
