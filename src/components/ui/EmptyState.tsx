import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <PrimaryButton label={actionLabel} onPress={onAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <PrimaryButton
            label={secondaryActionLabel}
            onPress={onSecondaryAction}
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceIconBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176, 106, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.sectionTitle,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.subtitle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
