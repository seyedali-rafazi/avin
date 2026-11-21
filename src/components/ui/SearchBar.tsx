import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '@/theme';

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
  placeholder = 'Search songs, artists, albums...',
  autoFocus = false,
  onSubmitEditing,
  onPressInput,
  editable = true,
  style,
}: SearchBarProps) {
  const content = (
    <View style={[styles.container, style]}>
      <Search size={18} color={Colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        autoFocus={autoFocus}
        editable={editable}
        pointerEvents={editable ? 'auto' : 'none'}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        selectionColor={Colors.accent}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && editable ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
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
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
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
