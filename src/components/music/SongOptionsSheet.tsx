import React, { useEffect, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import {
  BellRing,
  Edit3,
  Heart,
  Info,
  ListEnd,
  ListPlus,
  Play,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { AddToPlaylistSheet } from '@/components/music/AddToPlaylistSheet';
import { EditSongModal } from '@/components/music/EditSongModal';
import { BottomSheet, type SheetOption } from '@/components/ui/BottomSheet';
import { fileActionsService } from '@/services/media/fileActionsService';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Spacing, Typography } from '@/theme';
import type { Song } from '@/types/music';
import {
  formatDuration,
  formatFileSize,
  formatNumber,
  localizeMetadata,
} from '@/utils/format';

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
  const [activeSong, setActiveSong] = useState<Song | null>(song);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (song) {
      setActiveSong(song);
    }
  }, [song]);

  useEffect(() => {
    if (visible) {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      setShowPlaylistPicker(false);
      setShowInfo(false);
      setShowEditor(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  const targetSongBase = song ?? activeSong;
  const targetSong = useLibraryStore((s) =>
    targetSongBase
      ? (s.songs.find((item) => item.id === targetSongBase.id) ?? targetSongBase)
      : null
  );

  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const removeSongById = usePlayerStore((s) => s.removeSongById);

  const isFavorite = useLibraryStore((s) =>
    targetSong ? s.favoriteIds.has(targetSong.id) : false
  );
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const deleteSong = useLibraryStore((s) => s.deleteSong);
  const deleteSongFromDevice = useLibraryStore((s) => s.deleteSongFromDevice);

  if (!targetSong) return null;

  const openSubModal = (target: 'playlist' | 'editor' | 'info') => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
    }
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      if (target === 'playlist') {
        setShowPlaylistPicker(true);
      } else if (target === 'editor') {
        setShowEditor(true);
      } else {
        setShowInfo(true);
      }
    }, 180);
  };

  const artistName = localizeMetadata(targetSong.artist, 'هنرمند ناشناس');
  const albumName = localizeMetadata(targetSong.album, 'آلبوم ناشناس');
  const genreName = localizeMetadata(targetSong.genre, 'سبک ناشناس');
  const folderName = localizeMetadata(targetSong.folder, 'حافظه دستگاه');

  const handleShare = () => {
    void Share.share({
      title: targetSong.title,
      message: `${targetSong.title} — ${artistName}`,
      url: targetSong.fileUri,
    });
  };

  const handleDeleteSong = () => {
    Alert.alert(
      'حذف آهنگ',
      `می‌خواهید «${targetSong.title}» را فقط از کتابخانه برنامه حذف کنید یا فایل اصلی آن را نیز از حافظه دستگاه پاک کنید؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'فقط از کتابخانه',
          onPress: () => {
            removeSongById(targetSong.id);
            deleteSong(targetSong.id);
          },
        },
        {
          text: 'حذف دائمی از حافظه',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              removeSongById(targetSong.id);
              const res = await deleteSongFromDevice(targetSong);
              if (res.message) {
                Alert.alert('حذف فایل', res.message);
              }
            })();
          },
        },
      ]
    );
  };

  const options: SheetOption[] = [
    {
      label: 'پخش بعدی',
      icon: <Play size={19} color={Colors.textPrimary} />,
      onPress: () => playNext(targetSong),
    },
    {
      label: 'افزودن به صف پخش',
      icon: <ListEnd size={19} color={Colors.textPrimary} />,
      onPress: () => addToQueue(targetSong),
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
      onPress: () => toggleFavorite(targetSong.id),
    },
    {
      label: 'افزودن به پلی‌لیست',
      icon: <ListPlus size={19} color={Colors.textPrimary} />,
      onPress: () => openSubModal('playlist'),
    },
    {
      label: 'ویرایش مشخصات و کاور',
      icon: <Edit3 size={19} color={Colors.textPrimary} />,
      onPress: () => openSubModal('editor'),
    },
    {
      label: 'تنظیم به‌عنوان زنگ گوشی',
      icon: <BellRing size={19} color={Colors.textPrimary} />,
      onPress: () => void fileActionsService.setAsRingtone(targetSong),
    },
    {
      label: 'اشتراک‌گذاری',
      icon: <Share2 size={19} color={Colors.textPrimary} />,
      onPress: handleShare,
    },
    {
      label: 'مشخصات آهنگ',
      icon: <Info size={19} color={Colors.textPrimary} />,
      onPress: () => openSubModal('info'),
    },
  ];

  if (onRemoveFromPlaylist) {
    options.push({
      label: 'حذف از پلی‌لیست',
      icon: <Trash2 size={19} color={Colors.danger} />,
      destructive: true,
      onPress: onRemoveFromPlaylist,
    });
  } else {
    options.push({
      label: 'حذف آهنگ',
      icon: <Trash2 size={19} color={Colors.danger} />,
      destructive: true,
      onPress: handleDeleteSong,
    });
  }

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={targetSong.title}
        subtitle={`${artistName} • ${albumName}`}
        options={options}
      />

      <AddToPlaylistSheet
        visible={showPlaylistPicker}
        songIds={[targetSong.id]}
        onClose={() => setShowPlaylistPicker(false)}
      />

      <EditSongModal
        song={targetSong}
        visible={showEditor}
        onClose={() => setShowEditor(false)}
      />

      <BottomSheet
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title="مشخصات آهنگ"
      >
        <View style={styles.infoBlock}>
          <InfoRow label="عنوان" value={targetSong.title} />
          <InfoRow label="هنرمند" value={artistName} />
          <InfoRow label="آلبوم" value={albumName} />
          <InfoRow label="سبک" value={genreName} />
          {targetSong.year ? (
            <InfoRow label="سال" value={formatNumber(targetSong.year)} />
          ) : null}
          <InfoRow label="مدت زمان" value={formatDuration(targetSong.duration)} />
          <InfoRow label="تعداد پخش" value={`${formatNumber(targetSong.playCount)} بار`} />
          <InfoRow label="پوشه" value={folderName} />
          <InfoRow label="حجم فایل" value={formatFileSize(targetSong.fileSize)} />
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
