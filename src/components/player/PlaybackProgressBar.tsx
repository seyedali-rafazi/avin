import React, { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Fonts, Spacing } from '@/theme';
import { formatDuration } from '@/utils/format';

interface PlaybackProgressBarProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function PlaybackProgressBar({
  position,
  duration,
  onSeek,
}: PlaybackProgressBarProps) {
  const safeDuration = duration > 0 ? duration : 0;

  const [displayTime, setDisplayTime] = useState(position);
  const [isSeekingUi, setIsSeekingUi] = useState(false);
  const [seekLockUntil, setSeekLockUntil] = useState(0);

  const barWidthSV = useSharedValue(0);
  const durationSV = useSharedValue(safeDuration);
  const progressSV = useSharedValue(
    safeDuration > 0 ? Math.min(1, Math.max(0, position / safeDuration)) : 0
  );
  const isSeekingSV = useSharedValue(false);
  const thumbScaleSV = useSharedValue(1);

  const handleSeekStart = useCallback((seconds: number) => {
    setIsSeekingUi(true);
    setDisplayTime(seconds);
  }, []);

  const handleSeekUpdate = useCallback((seconds: number) => {
    setDisplayTime(seconds);
  }, []);

  const handleSeekCommit = useCallback(
    (seconds: number) => {
      setSeekLockUntil(Date.now() + 450);
      setDisplayTime(seconds);
      setIsSeekingUi(false);
      onSeek(seconds);
    },
    [onSeek]
  );

  const handleSeekCancel = useCallback(() => {
    setIsSeekingUi(false);
  }, []);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .hitSlop({ top: 14, bottom: 14, left: 8, right: 8 })
    .onBegin((e) => {
      const width = barWidthSV.get();
      const dur = durationSV.get();
      if (width <= 0 || dur <= 0) return;
      isSeekingSV.set(true);
      thumbScaleSV.set(withTiming(1.3, { duration: 100 }));
      const ratio = Math.min(1, Math.max(0, e.x / width));
      progressSV.set(ratio);
      runOnJS(handleSeekStart)(ratio * dur);
    })
    .onUpdate((e) => {
      const width = barWidthSV.get();
      const dur = durationSV.get();
      if (width <= 0 || dur <= 0) return;
      const ratio = Math.min(1, Math.max(0, e.x / width));
      progressSV.set(ratio);
      runOnJS(handleSeekUpdate)(ratio * dur);
    })
    .onEnd((e) => {
      const width = barWidthSV.get();
      const dur = durationSV.get();
      isSeekingSV.set(false);
      thumbScaleSV.set(withTiming(1, { duration: 120 }));
      if (width <= 0 || dur <= 0) {
        runOnJS(handleSeekCancel)();
        return;
      }
      const ratio = Math.min(1, Math.max(0, e.x / width));
      progressSV.set(ratio);
      runOnJS(handleSeekCommit)(ratio * dur);
    })
    .onFinalize((_, success) => {
      if (!success && isSeekingSV.get()) {
        isSeekingSV.set(false);
        thumbScaleSV.set(withTiming(1, { duration: 120 }));
        const dur = durationSV.get();
        if (dur > 0) {
          runOnJS(handleSeekCommit)(progressSV.get() * dur);
        } else {
          runOnJS(handleSeekCancel)();
        }
      }
    });

  useEffect(() => {
    durationSV.set(safeDuration);
  }, [safeDuration, durationSV]);

  useEffect(() => {
    if (isSeekingUi) return;
    if (Date.now() < seekLockUntil) return;

    const nextProgress =
      safeDuration > 0 ? Math.min(1, Math.max(0, position / safeDuration)) : 0;
    progressSV.set(nextProgress);
    const id = requestAnimationFrame(() => setDisplayTime(position));
    return () => cancelAnimationFrame(id);
  }, [position, safeDuration, isSeekingUi, seekLockUntil, progressSV]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressSV.get() * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${progressSV.get() * 100}%`,
    transform: [{ translateX: -7 }, { scale: thumbScaleSV.get() }],
  }));

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barWidthSV.set(e.nativeEvent.layout.width);
    },
    [barWidthSV]
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View
          style={styles.touchArea}
          onLayout={handleLayout}
          collapsable={false}
        >
          <View style={styles.track} pointerEvents="none">
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
        </View>
      </GestureDetector>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
        <Text style={styles.timeText}>{formatDuration(safeDuration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    direction: 'ltr',
  },
  touchArea: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.trackBackground,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accentSecondary,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  timeText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
