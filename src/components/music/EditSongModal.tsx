import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { AlbumArtwork } from '@/components/music/AlbumArtwork';
import { AppModal } from '@/components/ui/AppModal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { fileActionsService } from '@/services/media/fileActionsService';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';

interface EditSongModalProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
}

export function EditSongModal({ song, visible, onClose }: EditSongModalProps) {
  const updateSongMetadata = useLibraryStore((s) => s.updateSongMetadata);
  const syncUpdatedSong = usePlayerStore((s) => s.syncUpdatedSong);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [artworkUri, setArtworkUri] = useState<string | null>(null);

  useEffect(() => {
    if (song && visible) {
      setTitle(song.title);
      setArtist(song.artist);
      setAlbum(song.album);
      setGenre(song.genre);
      setYear(song.year ? String(song.year) : '');
      setArtworkUri(song.artworkUri);
    }
  }, [song, visible]);

  if (!song) return null;

  const handlePickArtwork = async () => {
    const uri = await fileActionsService.pickCustomArtwork(song.id);
    if (uri) {
      setArtworkUri(uri);
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('عنوان نامعتبر', 'لطفاً عنوان آهنگ را وارد کنید.');
      return;
    }

    const parsedYear = year.trim() ? Number(year.trim()) : null;
    const validYear =
      parsedYear && Number.isInteger(parsedYear) && parsedYear >= 1000 && parsedYear <= 2100
        ? parsedYear
        : null;

    const updated = updateSongMetadata(song.id, {
      title: trimmedTitle,
      artist: artist.trim() || 'هنرمند ناشناس',
      album: album.trim() || 'آلبوم ناشناس',
      genre: genre.trim() || 'سبک ناشناس',
      year: validYear,
      artworkUri,
    });

    if (updated) {
      syncUpdatedSong(updated);
    }
    onClose();
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="ویرایش مشخصات و کاور">
      <ScrollView
        showsVerticalScrollIndicator
        nestedScrollEnabled
        bounces={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Artwork Picker Row */}
        <View style={styles.artworkRow}>
          <AlbumArtwork uri={artworkUri} size={74} borderRadius={Radii.md} />
          <View style={styles.artworkActions}>
            <Pressable
              onPress={() => void handlePickArtwork()}
              style={({ pressed }) => [styles.artBtn, pressed && styles.pressed]}
            >
              <ImagePlus size={16} color={Colors.accentSecondary} />
              <Text style={styles.artBtnText}>انتخاب کاور جدید</Text>
            </Pressable>
            {artworkUri ? (
              <Pressable
                onPress={() => setArtworkUri(null)}
                style={({ pressed }) => [styles.removeArtBtn, pressed && styles.pressed]}
              >
                <Trash2 size={15} color={Colors.danger} />
                <Text style={styles.removeArtText}>حذف کاور</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Field label="عنوان آهنگ" value={title} onChangeText={setTitle} />
        <Field label="هنرمند" value={artist} onChangeText={setArtist} />
        <Field label="آلبوم" value={album} onChangeText={setAlbum} />
        <Field label="سبک (ژانر)" value={genre} onChangeText={setGenre} />
        <Field
          label="سال انتشار"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="مثلاً 1403 یا 2024"
        />
      </ScrollView>

      <View style={styles.modalActions}>
        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>انصراف</Text>
        </Pressable>
        <PrimaryButton label="ذخیره تغییرات" size="sm" onPress={handleSave} />
      </View>
    </AppModal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  artworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  artworkActions: {
    flex: 1,
    gap: Spacing.xs,
  },
  artBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  artBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  removeArtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
  },
  removeArtText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.danger,
  },
  pressed: {
    opacity: 0.72,
  },
  fieldWrap: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: Colors.border,
    writingDirection: 'rtl',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    fontSize: 13.5,
  },
});
