import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { Colors, Layout } from '@/theme';
import type { RepeatMode } from '@/types/music';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

const REPEAT_ACCESSIBILITY: Record<RepeatMode, string> = {
  off: 'خاموش',
  all: 'تکرار همه',
  one: 'تکرار یک آهنگ',
};

export function PlaybackControls({
  isPlaying,
  isBuffering = false,
  shuffle,
  repeatMode,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeat,
}: PlaybackControlsProps) {
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggleShuffle}
        hitSlop={12}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={shuffle ? 'غیرفعال کردن پخش تصادفی' : 'فعال کردن پخش تصادفی'}
      >
        <Shuffle
          size={20}
          color={shuffle ? Colors.accent : Colors.textSecondary}
        />
        {shuffle ? <View style={styles.activeDot} /> : null}
      </Pressable>

      <Pressable
        onPress={onPrevious}
        hitSlop={12}
        style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="آهنگ قبلی"
      >
        <SkipBack
          size={26}
          color={Colors.textPrimary}
          fill={Colors.textPrimary}
        />
      </Pressable>

      <Pressable
        onPress={onPlayPause}
        style={({ pressed }) => [styles.playBtn, pressed && styles.playBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'توقف' : 'پخش'}
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : isPlaying ? (
          <Pause size={28} color={Colors.textPrimary} fill={Colors.textPrimary} />
        ) : (
          <Play
            size={28}
            color={Colors.textPrimary}
            fill={Colors.textPrimary}
            style={styles.playIconOffset}
          />
        )}
      </Pressable>

      <Pressable
        onPress={onNext}
        hitSlop={12}
        style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="آهنگ بعدی"
      >
        <SkipForward
          size={26}
          color={Colors.textPrimary}
          fill={Colors.textPrimary}
        />
      </Pressable>

      <Pressable
        onPress={onCycleRepeat}
        hitSlop={12}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`حالت تکرار: ${REPEAT_ACCESSIBILITY[repeatMode]}`}
      >
        <RepeatIcon
          size={20}
          color={repeatMode !== 'off' ? Colors.accent : Colors.textSecondary}
        />
        {repeatMode !== 'off' ? <View style={styles.activeDot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    direction: 'ltr',
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: Layout.playButtonSize,
    height: Layout.playButtonSize,
    borderRadius: Layout.playButtonSize / 2,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  playBtnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  playIconOffset: {
    marginLeft: 3,
  },
  pressed: {
    opacity: 0.6,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});
