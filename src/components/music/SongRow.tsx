import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, MoreVertical } from 'lucide-react-native';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { isUnknownAlbum, localizeMetadata } from '@/utils/format';
import { AlbumArtwork } from './AlbumArtwork';

export const SONG_ROW_HEIGHT = 64;

interface SongRowProps {
  song: Song;
  index?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onMorePress?: () => void;
  onPressItem?: (song: Song, index: number) => void;
  onLongPressItem?: (song: Song) => void;
  onMorePressItem?: (song: Song) => void;
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
  index = 0,
  onPress,
  onLongPress,
  onMorePress,
  onPressItem,
  onLongPressItem,
  onMorePressItem,
  isActive = false,
  selectionMode = false,
  isSelected = false,
  showAlbum = false,
  rightElement,
  highlightQuery,
}: SongRowProps) {
  const handlePress = useCallback(() => {
    if (onPressItem) {
      onPressItem(song, index);
    } else {
      onPress?.();
    }
  }, [onPressItem, onPress, song, index]);

  const handleLongPress = useCallback(() => {
    if (onLongPressItem) {
      onLongPressItem(song);
    } else {
      onLongPress?.();
    }
  }, [onLongPressItem, onLongPress, song]);

  const handleMorePress = useCallback(() => {
    if (onMorePressItem) {
      onMorePressItem(song);
    } else {
      onMorePress?.();
    }
  }, [onMorePressItem, onMorePress, song]);

  const artistName = localizeMetadata(song.artist, 'هنرمند ناشناس');
  const albumName = localizeMetadata(song.album, 'آلبوم ناشناس');
  const subtitle =
    showAlbum && !isUnknownAlbum(song.album)
      ? `${artistName} • ${albumName}`
      : artistName;

  const hasMoreAction = Boolean(onMorePress || onMorePressItem);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress || onLongPressItem ? handleLongPress : undefined}
      delayLongPress={260}
      style={({ pressed }) => [
        styles.container,
        isActive && !isSelected && styles.activeContainer,
        isSelected && styles.selectedContainer,
        pressed && styles.pressed,
      ]}
    >
      {selectionMode ? (
        <View style={styles.checkboxWrap}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected ? (
              <Check size={13} color={Colors.textPrimary} strokeWidth={3} />
            ) : null}
          </View>
        </View>
      ) : null}

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
          {highlightQuery ? renderHighlightedText(song.title, highlightQuery) : song.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {highlightQuery ? renderHighlightedText(subtitle, highlightQuery) : subtitle}
        </Text>
      </View>

      {selectionMode ? null : rightElement ? (
        rightElement
      ) : hasMoreAction ? (
        <Pressable
          onPress={handleMorePress}
          hitSlop={10}
          style={({ pressed }) => [styles.moreBtn, pressed && styles.pressedIcon]}
          accessibilityRole="button"
          accessibilityLabel={`گزینه‌های بیشتر برای ${song.title}`}
        >
          <MoreVertical size={18} color={Colors.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    height: SONG_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
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
    width: 24,
    marginStart: 2,
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
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  activeTitle: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  highlightText: {
    fontFamily: Fonts.bold,
    color: Colors.accentSecondary,
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
