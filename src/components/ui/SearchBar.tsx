import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors, Fonts, Radii, Spacing } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  onPressInput?: () => void;
  editable?: boolean;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'جستجو در آهنگ‌ها، هنرمندان و آلبوم‌ها...',
  autoFocus = false,
  onSubmitEditing,
  onPressInput,
  editable = true,
  style,
}: SearchBarProps) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!autoFocus || !editable) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 240);
    return () => clearTimeout(timer);
  }, [autoFocus, editable]);

  const content = (
    <View style={[styles.container, style]}>
      <Search size={18} color={Colors.textSecondary} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        editable={editable}
        pointerEvents={editable ? 'auto' : 'none'}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        selectionColor={Colors.accent}
        autoCorrect={false}
        autoCapitalize="none"
        textAlign="right"
      />
      {value.length > 0 && editable ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="پاک کردن جستجو"
        >
          <X size={13} color={Colors.background} />
        </Pressable>
      ) : null}
    </View>
  );

  if (!editable && onPressInput) {
    return (
      <Pressable onPress={onPressInput} style={{ flex: 1 }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    fontSize: 13.5,
    paddingVertical: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
