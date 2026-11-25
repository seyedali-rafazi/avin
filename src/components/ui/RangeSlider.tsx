import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { Colors } from '@/theme';

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
}

export function RangeSlider({
  value,
  min,
  max,
  step = 0,
  disabled = false,
  onChange,
  onChangeComplete,
}: RangeSliderProps) {
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const clampedValue = Math.min(max, Math.max(min, value));
  const ratio = max > min ? (clampedValue - min) / (max - min) : 0;

  const computeValue = useCallback(
    (x: number) => {
      if (width <= 0 || max <= min) return min;
      const r = Math.min(1, Math.max(0, x / width));
      let next = min + r * (max - min);
      if (step > 0) {
        next = Math.round(next / step) * step;
      }
      return Math.min(max, Math.max(min, next));
    },
    [width, min, max, step]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          if (disabled) return;
          setDragging(true);
          onChange(computeValue(evt.nativeEvent.locationX));
        },
        onPanResponderMove: (evt) => {
          if (disabled) return;
          onChange(computeValue(evt.nativeEvent.locationX));
        },
        onPanResponderRelease: (evt) => {
          if (disabled) return;
          const next = computeValue(evt.nativeEvent.locationX);
          setDragging(false);
          onChange(next);
          onChangeComplete?.(next);
        },
        onPanResponderTerminate: () => {
          setDragging(false);
        },
      }),
    [disabled, computeValue, onChange, onChangeComplete]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[styles.touchArea, disabled && styles.disabled]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View
        style={[
          styles.thumb,
          {
            left: `${ratio * 100}%`,
            transform: [{ translateX: -8 }, { scale: dragging ? 1.2 : 1 }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    direction: 'ltr',
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accentSecondary,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },
});
