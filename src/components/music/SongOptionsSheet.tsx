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
import { formatDuration, formatFileSize, localizeMetadata } from '@/utils/format';

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

  const artistName = localizeMetadata(song.artist, 'هنرمند ناشناس');
  const albumName = localizeMetadata(song.album, 'آلبوم ناشناس');
  const genreName = localizeMetadata(song.genre, 'سبک ناشناس');
  const folderName = localizeMetadata(song.folder, 'حافظه دستگاه');

  const handleShare = () => {
    void Share.share({
      title: song.title,
      message: `${song.title} — ${artistName}`,
      url: song.fileUri,
    });
  };

  const options: SheetOption[] = [
    {
      label: 'پخش بعدی',
      icon: <Play size={19} color={Colors.textPrimary} />,
      onPress: () => playNext(song),
    },
    {
      label: 'افزودن به صف پخش',
      icon: <ListEnd size={19} color={Colors.textPrimary} />,
      onPress: () => addToQueue(song),
    },
    {
      label: isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها',
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
      label: 'افزودن به پلی‌لیست',
      icon: <ListPlus size={19} color={Colors.textPrimary} />,
      onPress: () => setShowPlaylistPicker(true),
    },
    {
      label: 'اشتراک‌گذاری',
      icon: <Share2 size={19} color={Colors.textPrimary} />,
      onPress: handleShare,
    },
    {
      label: 'مشخصات آهنگ',
      icon: <Info size={19} color={Colors.textPrimary} />,
      onPress: () => setShowInfo(true),
    },
  ];

  if (onRemoveFromPlaylist) {
    options.push({
      label: 'حذف از پلی‌لیست',
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
        subtitle={`${artistName} • ${albumName}`}
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
        title="مشخصات آهنگ"
      >
        <View style={styles.infoBlock}>
          <InfoRow label="عنوان" value={song.title} />
          <InfoRow label="هنرمند" value={artistName} />
          <InfoRow label="آلبوم" value={albumName} />
          <InfoRow label="سبک" value={genreName} />
          <InfoRow label="مدت زمان" value={formatDuration(song.duration)} />
          <InfoRow label="پوشه" value={folderName} />
          <InfoRow label="حجم فایل" value={formatFileSize(song.fileSize)} />
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
    alignItems: 'flex-start',
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
    textAlign: 'left',
  },
});
