import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';

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
      <View style={styles.start}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.labelWrap}>
          <Text style={[styles.title, destructive && styles.destructiveText]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.end}>
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
        {showChevron ? <ChevronLeft size={17} color={Colors.textMuted} /> : null}
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
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginRight: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    minHeight: 56,
    gap: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  start: {
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
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  destructiveText: {
    color: Colors.danger,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  valueText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  pressed: {
    backgroundColor: Colors.surfaceElevated,
  },
});
