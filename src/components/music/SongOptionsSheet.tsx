import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import {
  Heart,
  Info,
  ListEnd,
  ListPlus,
  Play,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { AddToPlaylistSheet } from '@/components/music/AddToPlaylistSheet';
import { BottomSheet, type SheetOption } from '@/components/ui/BottomSheet';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Spacing, Typography } from '@/theme';
import type { Song } from '@/types/music';
import { formatDuration, formatFileSize } from '@/utils/format';

interface SongOptionsSheetProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
  onRemoveFromPlaylist?: () => void;
}

export function SongOptionsSheet({
  song,
  visible,
  onClose,
  onRemoveFromPlaylist,
}: SongOptionsSheetProps) {
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const isFavorite = useLibraryStore((s) => (song ? s.favoriteIds.has(song.id) : false));
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  if (!song) return null;

  const handleShare = () => {
    void Share.share({
      title: song.title,
      message: `${song.title} — ${song.artist}`,
      url: song.fileUri,
    });
  };

  const options: SheetOption[] = [
    {
      label: 'Play Next',
      icon: <Play size={19} color={Colors.textPrimary} />,
      onPress: () => playNext(song),
    },
    {
      label: 'Add to Queue',
      icon: <ListEnd size={19} color={Colors.textPrimary} />,
      onPress: () => addToQueue(song),
    },
    {
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: (
        <Heart
          size={19}
          color={isFavorite ? Colors.accent : Colors.textPrimary}
          fill={isFavorite ? Colors.accent : 'transparent'}
        />
      ),
      onPress: () => toggleFavorite(song.id),
    },
    {
      label: 'Add to Playlist',
      icon: <ListPlus size={19} color={Colors.textPrimary} />,
      onPress: () => setShowPlaylistPicker(true),
    },
    {
      label: 'Share',
      icon: <Share2 size={19} color={Colors.textPrimary} />,
      onPress: handleShare,
    },
    {
      label: 'Song Details',
      icon: <Info size={19} color={Colors.textPrimary} />,
      onPress: () => setShowInfo(true),
    },
  ];

  if (onRemoveFromPlaylist) {
    options.push({
      label: 'Remove from Playlist',
      icon: <Trash2 size={19} color={Colors.danger} />,
      destructive: true,
      onPress: onRemoveFromPlaylist,
    });
  }

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={song.title}
        subtitle={`${song.artist} • ${song.album}`}
        options={options}
      />

      <AddToPlaylistSheet
        visible={showPlaylistPicker}
        songIds={[song.id]}
        onClose={() => setShowPlaylistPicker(false)}
      />

      <BottomSheet
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title="Track Information"
      >
        <View style={styles.infoBlock}>
          <InfoRow label="Title" value={song.title} />
          <InfoRow label="Artist" value={song.artist} />
          <InfoRow label="Album" value={song.album} />
          <InfoRow label="Genre" value={song.genre} />
          <InfoRow label="Duration" value={formatDuration(song.duration)} />
          <InfoRow label="Folder" value={song.folder} />
          <InfoRow label="File Size" value={formatFileSize(song.fileSize)} />
        </View>
      </BottomSheet>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBlock: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  infoLabel: {
    ...Typography.subtitle,
    color: Colors.textMuted,
    width: 84,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});
