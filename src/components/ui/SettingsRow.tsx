import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Layout, Radii, Spacing } from '@/theme';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  valueText?: string;
  showChevron?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
}

export function SettingsRow({
  title,
  subtitle,
  icon,
  valueText,
  showChevron = false,
  switchValue,
  onSwitchChange,
  rightElement,
  onPress,
  isLast = false,
  destructive = false,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.left}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.labelWrap}>
          <Text style={[styles.title, destructive && styles.destructiveText]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        {valueText ? <Text style={styles.valueText}>{valueText}</Text> : null}
        {rightElement}
        {typeof switchValue === 'boolean' && onSwitchChange ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: Colors.switchTrackOff, true: Colors.accent }}
            thumbColor={Colors.switchThumb}
          />
        ) : null}
        {showChevron ? <ChevronRight size={17} color={Colors.textMuted} /> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Layout.screenPadding,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    minHeight: 54,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  destructiveText: {
    color: Colors.danger,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  valueText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  pressed: {
    backgroundColor: Colors.surfaceElevated,
  },
});
