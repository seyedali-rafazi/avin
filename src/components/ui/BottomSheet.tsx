import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radii, Spacing, Typography } from '@/theme';

export interface SheetOption {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightText?: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
  accent?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options?: SheetOption[];
  children?: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 20) + Spacing.lg;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="بستن"
        />
        <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text style={Typography.sectionTitle} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            bounces={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {options?.map((option, idx) => (
              <Pressable
                key={`${option.label}-${idx}`}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  option.selected && styles.selectedOption,
                  option.accent && styles.accentOption,
                  pressed && styles.pressed,
                ]}
              >
                {option.icon ? <View style={styles.iconWrap}>{option.icon}</View> : null}
                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionLabel,
                      option.destructive && styles.destructiveLabel,
                      option.selected && styles.selectedLabel,
                      option.accent && styles.accentLabel,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {option.subtitle ? (
                    <Text style={styles.optionSubtitle} numberOfLines={1}>
                      {option.subtitle}
                    </Text>
                  ) : null}
                </View>
                {option.rightText ? (
                  <Text
                    style={[
                      styles.rightText,
                      option.selected && styles.selectedRightText,
                    ]}
                  >
                    {option.rightText}
                  </Text>
                ) : null}
              </Pressable>
            ))}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
    direction: 'rtl',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    maxHeight: '80%',
    direction: 'rtl',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDashed,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    alignItems: 'flex-start',
  },
  subtitle: {
    ...Typography.subtitle,
    marginTop: 2,
  },
  content: {
    paddingTop: Spacing.xs,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  selectedOption: {
    backgroundColor: Colors.surfaceHighlight,
  },
  accentOption: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  pressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  optionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  destructiveLabel: {
    color: Colors.danger,
  },
  selectedLabel: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
  accentLabel: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
  rightText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  selectedRightText: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
});
