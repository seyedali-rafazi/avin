import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
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
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';

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

export function SelectionActionBar({
  selectedSongs,
  allSelected,
  onToggleSelectAll,
  onCancel,
  onCustomDelete,
  deleteLabel = 'Delete',
  insideTabScreen = false,
}: SelectionActionBarProps) {
  const insets = useSafeAreaInsets();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const deleteSongs = useLibraryStore((s) => s.deleteSongs);

  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);

  if (selectedSongs.length === 0) return null;

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
          message: `${firstSong.title} — ${firstSong.artist}`,
          url: firstSong.fileUri,
        });
      } else {
        const list = selectedSongs
          .map((s, idx) => `${idx + 1}. ${s.title} — ${s.artist}`)
          .join('\n');
        await Share.share({
          title: `${selectedSongs.length} Songs`,
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
      'Delete Songs',
      `Remove ${selectedSongs.length} ${selectedSongs.length === 1 ? 'song' : 'songs'} from your Avin library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
        entering={SlideInDown.springify().damping(22).stiffness(240)}
        exiting={SlideOutDown.duration(180)}
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
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>

          <Text style={styles.countText}>
            {selectedSongs.length} selected
          </Text>

          <Pressable
            onPress={onCancel}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
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
            accessibilityLabel="Play selected songs"
          >
            <View style={[styles.iconCircle, styles.playCircle]}>
              <Play size={18} color={Colors.textPrimary} fill={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>Play</Text>
          </Pressable>

          <Pressable
            onPress={() => setPlaylistSheetVisible(true)}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add selected songs to playlist"
          >
            <View style={styles.iconCircle}>
              <ListPlus size={18} color={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>Add</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleShare()}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Share selected songs"
          >
            <View style={styles.iconCircle}>
              <Share2 size={18} color={Colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Delete selected songs"
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deleteLabel: {
    color: Colors.danger,
  },
});
