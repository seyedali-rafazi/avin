import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Clock, Moon, XCircle } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useSleepTimerStore } from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import { formatDuration, formatNumber } from '@/utils/format';

interface SleepTimerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_MINUTES = [15, 30, 45, 60, 90] as const;

export function SleepTimerSheet({ visible, onClose }: SleepTimerSheetProps) {
  const mode = useSleepTimerStore((s) => s.mode);
  const remainingSeconds = useSleepTimerStore((s) => s.remainingSeconds);
  const fadeOutEnabled = useSleepTimerStore((s) => s.fadeOutEnabled);
  const startTimer = useSleepTimerStore((s) => s.startTimer);
  const startEndOfTrack = useSleepTimerStore((s) => s.startEndOfTrack);
  const setFadeOutEnabled = useSleepTimerStore((s) => s.setFadeOutEnabled);
  const cancelTimer = useSleepTimerStore((s) => s.cancelTimer);

  const [customMinutes, setCustomMinutes] = useState('');

  const handleStartCustom = () => {
    const mins = Number(customMinutes.replace(/[^0-9]/g, ''));
    if (Number.isFinite(mins) && mins > 0 && mins <= 600) {
      startTimer(mins);
      setCustomMinutes('');
      onClose();
    }
  };

  const subtitle =
    mode === 'duration'
      ? `زمان باقی‌مانده: ${formatDuration(remainingSeconds)}`
      : mode === 'end-of-track'
        ? 'توقف در پایان آهنگ فعلی'
        : 'پخش موسیقی به‌صورت خودکار متوقف می‌شود';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="تایمر خواب"
      subtitle={subtitle}
    >
      <View style={styles.content}>
        {mode !== 'off' ? (
          <View style={styles.activeBanner}>
            <View style={styles.activeMeta}>
              <Moon size={18} color={Colors.accentSecondary} />
              <Text style={styles.activeText}>
                {mode === 'duration'
                  ? `توقف خودکار تا ${formatDuration(remainingSeconds)} دیگر`
                  : 'توقف خودکار در پایان آهنگ فعلی'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                cancelTimer();
                onClose();
              }}
              style={styles.cancelTimerBtn}
            >
              <XCircle size={16} color={Colors.danger} />
              <Text style={styles.cancelTimerText}>لغو</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Quick Preset Grid */}
        <View style={styles.presetGrid}>
          {PRESET_MINUTES.map((mins) => (
            <Pressable
              key={mins}
              onPress={() => {
                startTimer(mins);
                onClose();
              }}
              style={({ pressed }) => [styles.presetBtn, pressed && styles.pressed]}
            >
              <Clock size={16} color={Colors.accentSecondary} />
              <Text style={styles.presetLabel}>{formatNumber(mins)} دقیقه</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              startEndOfTrack();
              onClose();
            }}
            style={({ pressed }) => [
              styles.presetBtn,
              mode === 'end-of-track' && styles.presetBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Moon size={16} color={Colors.accentSecondary} />
            <Text style={styles.presetLabel}>پایان آهنگ فعلی</Text>
          </Pressable>
        </View>

        {/* Custom Minutes */}
        <View style={styles.customRow}>
          <TextInput
            value={customMinutes}
            onChangeText={setCustomMinutes}
            placeholder="زمان دلخواه (دقیقه)"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
            style={styles.customInput}
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={handleStartCustom}
          />
          <PrimaryButton
            label="تنظیم"
            size="sm"
            disabled={!customMinutes.trim()}
            onPress={handleStartCustom}
          />
        </View>

        {/* Smooth Fade-Out Option */}
        <View style={styles.fadeRow}>
          <View style={styles.fadeTextWrap}>
            <Text style={styles.fadeTitle}>کم شدن تدریجی صدا (Fade-out)</Text>
            <Text style={styles.fadeSub}>در ۱۰ ثانیه پایانی صدا به‌آرامی کم می‌شود</Text>
          </View>
          <Switch
            value={fadeOutEnabled}
            onValueChange={setFadeOutEnabled}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor={Colors.textPrimary}
          />
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
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  activeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  activeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  cancelTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelTimerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    color: Colors.danger,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  presetBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  presetBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceHighlight,
  },
  presetLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  fadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  fadeTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: Spacing.sm,
  },
  fadeTitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  fadeSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
