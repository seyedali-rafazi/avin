import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RangeSlider } from '@/components/ui/RangeSlider';
import {
  EQUALIZER_BANDS,
  EQUALIZER_PRESETS,
} from '@/services/audio/equalizerService';
import { usePlayerStore, useSettingsStore } from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import { formatNumber } from '@/utils/format';

interface AudioEffectsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AudioEffectsSheet({ visible, onClose }: AudioEffectsSheetProps) {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const settings = useSettingsStore((s) => s.settings);
  const setEqualizerEnabled = useSettingsStore((s) => s.setEqualizerEnabled);
  const setEqualizerPreset = useSettingsStore((s) => s.setEqualizerPreset);
  const setEqualizerBand = useSettingsStore((s) => s.setEqualizerBand);
  const setBassBoost = useSettingsStore((s) => s.setBassBoost);

  const volumePercent = Math.round(volume * 100);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="تنظیمات صدا و اکولایزر"
      subtitle={`بلندی صدا: ${formatNumber(volumePercent)}٪`}
    >
      <View style={styles.content}>
        {/* Continuous Volume Control */}
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>بلندی صدا</Text>
            <Pressable
              onPress={() => setVolume(volume > 0 ? 0 : 1)}
              hitSlop={8}
              style={styles.muteBtn}
            >
              {volume === 0 ? (
                <VolumeX size={18} color={Colors.danger} />
              ) : (
                <Volume2 size={18} color={Colors.accentSecondary} />
              )}
              <Text style={styles.percentText}>{formatNumber(volumePercent)}٪</Text>
            </Pressable>
          </View>
          <RangeSlider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={setVolume}
          />
        </View>

        {/* Equalizer Toggle & Presets */}
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>اکولایزر ۵ بانده</Text>
            <Switch
              value={settings.equalizerEnabled}
              onValueChange={setEqualizerEnabled}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            {EQUALIZER_PRESETS.map((preset) => {
              const active = settings.equalizerPreset === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    if (!settings.equalizerEnabled) {
                      setEqualizerEnabled(true);
                    }
                    setEqualizerPreset(preset.id);
                  }}
                  style={[styles.presetPill, active && styles.presetPillActive]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      active && styles.presetTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 5 Band Sliders */}
          <View style={styles.bandsList}>
            {EQUALIZER_BANDS.map((band) => {
              const val = settings.equalizerBands[band.index] ?? 0;
              return (
                <View key={band.freqLabel} style={styles.bandRow}>
                  <Text style={styles.freqLabel}>{band.freqLabel}</Text>
                  <View style={styles.bandSliderWrap}>
                    <RangeSlider
                      value={val}
                      min={-12}
                      max={12}
                      step={1}
                      disabled={!settings.equalizerEnabled}
                      onChange={(next) => setEqualizerBand(band.index, next)}
                    />
                  </View>
                  <Text style={styles.dbLabel}>
                    {val > 0 ? `+${formatNumber(val)}` : formatNumber(val)} dB
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Bass Boost */}
          <View style={[styles.rowBetween, styles.bassRow]}>
            <Text style={styles.bassLabel}>تقویت باس (Bass Boost)</Text>
            <Switch
              value={settings.bassBoost}
              onValueChange={setBassBoost}
              disabled={!settings.equalizerEnabled}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  muteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    color: Colors.accentSecondary,
    minWidth: 38,
    textAlign: 'left',
  },
  presetsRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  presetPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  presetPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  presetText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  presetTextActive: {
    color: Colors.textPrimary,
  },
  bandsList: {
    gap: 4,
    marginTop: Spacing.xs,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  freqLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.textSecondary,
    width: 44,
    textAlign: 'left',
  },
  bandSliderWrap: {
    flex: 1,
  },
  dbLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    width: 46,
    textAlign: 'left',
  },
  bassRow: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  bassLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
