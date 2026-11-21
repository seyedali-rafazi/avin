import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 40,
  style,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.35,
  },
});
