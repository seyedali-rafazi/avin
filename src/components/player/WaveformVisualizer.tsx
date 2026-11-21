import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme';

const BAR_WEIGHTS = [
  0.14, 0.22, 0.18, 0.34, 0.28, 0.48, 0.38, 0.62, 0.46, 0.78, 0.56, 0.92,
  0.72, 1.0, 0.76, 0.88, 0.54, 0.74, 0.44, 0.60, 0.36, 0.46, 0.26, 0.32,
  0.18, 0.22, 0.14,
];

function VisualizerBar({
  weight,
  index,
  isPlaying,
}: {
  weight: number;
  index: number;
  isPlaying: boolean;
}) {
  const height = useSharedValue(Math.max(4, weight * 14));

  useEffect(() => {
    const maxH = Math.max(8, weight * 38);
    const minH = Math.max(4, weight * 10);

    if (isPlaying) {
      height.value = withDelay(
        (index % 7) * 55,
        withRepeat(
          withSequence(
            withTiming(maxH, {
              duration: 380 + (index % 5) * 70,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(minH, {
              duration: 360 + (index % 4) * 80,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(Math.max(4, weight * 14), { duration: 300 });
    }
  }, [isPlaying, index, weight, height]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const opacity = 0.25 + weight * 0.65;

  return (
    <Animated.View
      style={[styles.bar, { opacity }, animStyle]}
    />
  );
}

interface WaveformVisualizerProps {
  isPlaying: boolean;
}

export function WaveformVisualizer({ isPlaying }: WaveformVisualizerProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {BAR_WEIGHTS.map((weight, idx) => (
        <VisualizerBar
          key={idx}
          weight={weight}
          index={idx}
          isPlaying={isPlaying}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 5,
    width: '100%',
    overflow: 'hidden',
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});
