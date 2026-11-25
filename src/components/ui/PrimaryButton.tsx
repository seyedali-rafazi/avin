import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Colors, Fonts, Radii, Spacing } from '@/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          variant === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    gap: Spacing.sm,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  sm: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
  },
  md: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 11,
  },
  lg: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 13,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 22,
  },
  labelSm: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  dangerLabel: {
    color: Colors.danger,
  },
});
