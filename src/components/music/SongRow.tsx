import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check, MoreVertical } from 'lucide-react-native';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { AlbumArtwork } from './AlbumArtwork';

interface SongRowProps {
  song: Song;
  onPress: () => void;
  onLongPress?: () => void;
  onMorePress?: () => void;
  isActive?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  showAlbum?: boolean;
  rightElement?: React.ReactNode;
  highlightQuery?: string;
}

function renderHighlightedText(text: string, query?: string) {
  if (!query || !query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <Text key={idx} style={styles.highlightText}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

export const SongRow = React.memo(function SongRow({
  song,
  onPress,
  onLongPress,
  onMorePress,
  isActive = false,
  selectionMode = false,
  isSelected = false,
  showAlbum = false,
  rightElement,
  highlightQuery,
}: SongRowProps) {
  const selectModeAnim = useSharedValue(selectionMode ? 1 : 0);
  const selectedScale = useSharedValue(1);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectModeAnim.value = withTiming(selectionMode ? 1 : 0, { duration: 220 });
  }, [selectionMode, selectModeAnim]);

  useEffect(() => {
    checkScale.value = withSpring(isSelected ? 1 : 0, {
      damping: 16,
      stiffness: 260,
    });
    if (isSelected) {
      selectedScale.value = withSpring(0.98, { damping: 14, stiffness: 320 }, () => {
        selectedScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      });
    }
  }, [isSelected, checkScale, selectedScale]);

  const rowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectedScale.value }],
  }));

  const checkboxWrapStyle = useAnimatedStyle(() => ({
    width: interpolate(selectModeAnim.value, [0, 1], [0, 26]),
    marginRight: interpolate(selectModeAnim.value, [0, 1], [0, 4]),
    opacity: selectModeAnim.value,
    transform: [{ scale: interpolate(selectModeAnim.value, [0, 1], [0.5, 1]) }],
  }));

  const checkInnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const subtitle =
    showAlbum && song.album !== 'Unknown Album'
      ? `${song.artist} • ${song.album}`
      : song.artist;

  return (
    <Animated.View style={rowAnimStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={260}
        style={({ pressed }) => [
          styles.container,
          isActive && !isSelected && styles.activeContainer,
          isSelected && styles.selectedContainer,
          pressed && styles.pressed,
        ]}
      >
        <Animated.View style={[styles.checkboxWrap, checkboxWrapStyle]}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            <Animated.View style={checkInnerStyle}>
              <Check size={13} color={Colors.textPrimary} strokeWidth={3} />
            </Animated.View>
          </View>
        </Animated.View>

        <AlbumArtwork
          uri={song.artworkUri}
          size={Layout.songRowArtwork}
          borderRadius={Radii.sm}
        />

        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              (isActive || isSelected) && styles.activeTitle,
            ]}
            numberOfLines={1}
          >
            {renderHighlightedText(song.title, highlightQuery)}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {renderHighlightedText(subtitle, highlightQuery)}
          </Text>
        </View>

        {selectionMode ? null : rightElement ? (
          rightElement
        ) : onMorePress ? (
          <Pressable
            onPress={onMorePress}
            hitSlop={10}
            style={({ pressed }) => [styles.moreBtn, pressed && styles.pressedIcon]}
            accessibilityRole="button"
            accessibilityLabel={`More options for ${song.title}`}
          >
            <MoreVertical size={18} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 8,
    gap: Spacing.md,
  },
  activeContainer: {
    backgroundColor: Colors.surfaceHighlight,
  },
  selectedContainer: {
    backgroundColor: 'rgba(145, 61, 255, 0.16)',
  },
  pressed: {
    backgroundColor: Colors.surface,
  },
  checkboxWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  activeTitle: {
    color: Colors.accentSecondary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  highlightText: {
    color: Colors.accentSecondary,
    fontWeight: '700',
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedIcon: {
    opacity: 0.6,
  },
});
