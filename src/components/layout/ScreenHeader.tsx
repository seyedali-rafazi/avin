import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Colors, Layout, Spacing, Typography } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  compact?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightElement,
  compact = false,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.startRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="بازگشت"
          >
            <ArrowRight size={20} color={Colors.textPrimary} />
          </Pressable>
        ) : null}
        <View style={styles.textBlock}>
          <Text
            style={onBack ? Typography.greeting : Typography.screenTitle}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightElement ? <View style={styles.end}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  compact: {
    paddingBottom: Spacing.sm,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  textBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subtitle: {
    ...Typography.subtitle,
    marginTop: 1,
  },
  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
