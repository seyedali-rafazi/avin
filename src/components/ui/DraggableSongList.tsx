import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AudioLines, GripVertical, X } from 'lucide-react-native';
import { AlbumArtwork } from '@/components/music/AlbumArtwork';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { localizeMetadata } from '@/utils/format';

const ITEM_HEIGHT = 68;

interface DraggableRowProps {
  song: Song;
  index: number;
  totalCount: number;
  isCurrent: boolean;
  onPress: () => void;
  onRemove?: () => void;
  onCommitReorder: (fromIndex: number, toIndex: number) => void;
  onDragStateChange: (dragging: boolean) => void;
}

function DraggableRow({
  song,
  index,
  totalCount,
  isCurrent,
  onPress,
  onRemove,
  onCommitReorder,
  onDragStateChange,
}: DraggableRowProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const triggerHaptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(120)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(onDragStateChange)(true);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const deltaRows = Math.round(e.translationY / ITEM_HEIGHT);
      const targetIndex = Math.max(0, Math.min(totalCount - 1, index + deltaRows));
      translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      isDragging.value = false;
      runOnJS(onDragStateChange)(false);
      if (targetIndex !== index) {
        runOnJS(onCommitReorder)(index, targetIndex);
      }
    })
    .onFinalize(() => {
      if (isDragging.value) {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        isDragging.value = false;
        runOnJS(onDragStateChange)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.02 : 1 },
    ],
    zIndex: isDragging.value ? 100 : 1,
    elevation: isDragging.value ? 10 : 0,
    backgroundColor: isDragging.value
      ? Colors.surfaceElevated
      : isCurrent
        ? Colors.surfaceHighlight
        : 'transparent',
  }));

  return (
    <Animated.View style={[styles.rowWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {isCurrent ? <View style={styles.activeAccentBar} /> : null}

        <GestureDetector gesture={panGesture}>
          <View
            style={styles.dragHandle}
            accessibilityLabel={`کشیدن برای جابه‌جایی ${song.title}`}
          >
            <GripVertical size={18} color={Colors.textMuted} />
          </View>
        </GestureDetector>

        <AlbumArtwork uri={song.artworkUri} size={46} borderRadius={Radii.sm} />

        <View style={styles.info}>
          <Text
            style={[styles.title, isCurrent && styles.currentTitle]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {localizeMetadata(song.artist, 'هنرمند ناشناس')}
          </Text>
        </View>

        {isCurrent ? (
          <View style={styles.equalizerWrap}>
            <AudioLines size={20} color={Colors.accent} />
          </View>
        ) : onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={styles.removeBtn}
            accessibilityLabel={`حذف ${song.title}`}
          >
            <X size={16} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

interface DraggableSongListProps {
  songs: Song[];
  currentIndex?: number;
  currentSongId?: string | null;
  onPressSong: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemoveSong?: (index: number) => void;
  ListHeaderComponent?: React.ReactElement;
}

export function DraggableSongList({
  songs,
  currentIndex,
  currentSongId,
  onPressSong,
  onReorder,
  onRemoveSong,
  ListHeaderComponent,
}: DraggableSongListProps) {
  const [scrollEnabled, setScrollEnabled] = useState(true);

  return (
    <FlatList
      data={songs}
      scrollEnabled={scrollEnabled}
      keyExtractor={(item, idx) => `${item.id}-${idx}`}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => {
        const isCurrent =
          currentIndex !== undefined
            ? index === currentIndex
            : Boolean(currentSongId && item.id === currentSongId);

        return (
          <DraggableRow
            song={item}
            index={index}
            totalCount={songs.length}
            isCurrent={isCurrent}
            onPress={() => onPressSong(index)}
            onRemove={onRemoveSong ? () => onRemoveSong(index) : undefined}
            onCommitReorder={onReorder}
            onDragStateChange={(dragging) => setScrollEnabled(!dragging)}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xl,
    gap: 4,
  },
  rowWrap: {
    borderRadius: Radii.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
    position: 'relative',
    minHeight: ITEM_HEIGHT - 4,
  },
  activeAccentBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  dragHandle: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  info: {
    flex: 1,
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
  currentTitle: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
  artist: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  equalizerWrap: {
    paddingHorizontal: 6,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
