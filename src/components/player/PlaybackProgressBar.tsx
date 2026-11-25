import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const [barWidth, setBarWidth] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);

  const safeDuration = duration > 0 ? duration : 0;
  const activePosition = isSeeking ? seekPreview : position;
  const progress = safeDuration > 0 ? Math.min(1, Math.max(0, activePosition / safeDuration)) : 0;

  const computeTimeFromX = useCallback(
    (x: number) => {
      if (barWidth <= 0 || safeDuration <= 0) return 0;
      const ratio = Math.min(1, Math.max(0, x / barWidth));
      return ratio * safeDuration;
    },
    [barWidth, safeDuration]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          setIsSeeking(true);
          setSeekPreview(computeTimeFromX(evt.nativeEvent.locationX));
        },
        onPanResponderMove: (evt) => {
          setSeekPreview(computeTimeFromX(evt.nativeEvent.locationX));
        },
        onPanResponderRelease: (evt) => {
          const target = computeTimeFromX(evt.nativeEvent.locationX);
          setIsSeeking(false);
          onSeek(target);
        },
        onPanResponderTerminate: () => {
          setIsSeeking(false);
        },
      }),
    [computeTimeFromX, onSeek]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.touchArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: `${progress * 100}%`,
              transform: [{ translateX: -6 }, { scale: isSeeking ? 1.25 : 1 }],
            },
          ]}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(activePosition)}</Text>
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
    height: 28,
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
    width: 12,
    height: 12,
    borderRadius: 6,
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
