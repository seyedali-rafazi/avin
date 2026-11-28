import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckSquare,
  ListPlus,
  Play,
  Share2,
  Square,
  Trash2,
  X,
} from 'lucide-react-native';
import { AddToPlaylistSheet } from '@/components/music/AddToPlaylistSheet';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { formatNumber, formatSongCount, localizeMetadata } from '@/utils/format';

interface SelectionActionBarProps {
  selectedSongs: Song[];
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onCancel: () => void;
  /** Optional custom delete handler (e.g. remove from playlist instead of library) */
  onCustomDelete?: (songs: Song[]) => void;
  deleteLabel?: string;
  /** Set true when rendered inside a tab screen that already accounts for bottom tab bar */
  insideTabScreen?: boolean;
}

let activeSelectionBars = 0;
const selectionListeners = new Set<() => void>();

function notifySelectionListeners(): void {
  for (const listener of selectionListeners) {
    listener();
  }
}

export function useIsSelectionBarActive(): boolean {
  const [active, setActive] = useState(() => activeSelectionBars > 0);
  useEffect(() => {
    const sync = () => setActive(activeSelectionBars > 0);
    selectionListeners.add(sync);
    sync();
    return () => {
      selectionListeners.delete(sync);
    };
  }, []);
  return active;
}

export function SelectionActionBar({
  selectedSongs,
  allSelected,
  onToggleSelectAll,
  onCancel,
  onCustomDelete,
  deleteLabel = 'حذف',
  insideTabScreen = false,
}: SelectionActionBarProps) {
  const insets = useSafeAreaInsets();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const deleteSongs = useLibraryStore((s) => s.deleteSongs);

  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);
  const isVisible = selectedSongs.length > 0;

  useEffect(() => {
    if (!isVisible) return;
    activeSelectionBars += 1;
    notifySelectionListeners();
    return () => {
      activeSelectionBars = Math.max(0, activeSelectionBars - 1);
      notifySelectionListeners();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const songIds = selectedSongs.map((s) => s.id);

  const handlePlay = () => {
    void playQueue(selectedSongs, 0, false);
    onCancel();
  };

  const handleShare = async () => {
    try {
      const firstSong = selectedSongs[0];
      if (selectedSongs.length === 1 && firstSong) {
        await Share.share({
          title: firstSong.title,
          message: `${firstSong.title} — ${localizeMetadata(firstSong.artist, 'هنرمند ناشناس')}`,
          url: firstSong.fileUri,
        });
      } else {
        const list = selectedSongs
          .map(
            (s, idx) =>
              `${formatNumber(idx + 1)}. ${s.title} — ${localizeMetadata(s.artist, 'هنرمند ناشناس')}`
          )
          .join('\n');
        await Share.share({
          title: formatSongCount(selectedSongs.length),
          message: list,
        });
      }
    } catch {
      // User dismissed share sheet
    }
  };

  const handleDelete = () => {
    if (onCustomDelete) {
      onCustomDelete(selectedSongs);
      return;
    }

    Alert.alert(
      'حذف آهنگ‌ها',
      `آیا می‌خواهید ${formatSongCount(selectedSongs.length)} را از کتابخانه آوین حذف کنید؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            deleteSongs(songIds);
            onCancel();
          },
        },
      ]
    );
  };

  const bottomPad = insideTabScreen
    ? Spacing.md
    : Math.max(insets.bottom, Spacing.md) + Spacing.xs;

  return (
    <>
      <Animated.View
        entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
        style={[styles.container, { paddingBottom: bottomPad }]}
      >
        {/* Top Selection Status Strip */}
        <View style={styles.topStrip}>
          <Pressable
            onPress={onToggleSelectAll}
            hitSlop={8}
            style={({ pressed }) => [styles.selectAllBtn, pressed && styles.pressed]}
          >
            {allSelected ? (
              <CheckSquare size={17} color={Colors.accentSecondary} />
            ) : (
              <Square size={17} color={Colors.textSecondary} />
            )}
            <Text style={styles.selectAllText}>
              {allSelected ? 'لغو همه' : 'انتخاب همه'}
            </Text>
          </Pressable>

          <Text style={styles.countText}>
            {formatNumber(selectedSongs.length)} انتخاب شده
          </Text>

          <Pressable
            onPress={onCancel}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="لغو انتخاب"
          >
            <X size={19} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* 4 Action Buttons: Play, Add, Share, Delete */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handlePlay}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="پخش آهنگ‌های انتخاب‌شده"
          >
            <View style={[styles.iconCircle, styles.playCircle]}>
              <Play size={18} color={Colors.textPrimary} fill={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>پخش</Text>
          </Pressable>

          <Pressable
            onPress={() => setPlaylistSheetVisible(true)}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="افزودن به پلی‌لیست"
          >
            <View style={styles.iconCircle}>
              <ListPlus size={18} color={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>افزودن</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleShare()}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="اشتراک‌گذاری آهنگ‌های انتخاب‌شده"
          >
            <View style={styles.iconCircle}>
              <Share2 size={18} color={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>اشتراک</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="حذف آهنگ‌های انتخاب‌شده"
          >
            <View style={[styles.iconCircle, styles.deleteCircle]}>
              <Trash2 size={18} color={Colors.danger} />
            </View>
            <Text style={[styles.actionLabel, styles.deleteLabel]}>
              {deleteLabel}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <AddToPlaylistSheet
        visible={playlistSheetVisible}
        songIds={songIds}
        onClose={() => setPlaylistSheetVisible(false)}
        onComplete={onCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 18,
    zIndex: 40,
    direction: 'rtl',
  },
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  selectAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: Radii.md,
    gap: 6,
  },
  actionPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  playCircle: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  deleteCircle: {
    backgroundColor: Colors.dangerMuted,
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  actionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  deleteLabel: {
    color: Colors.danger,
  },
});
