import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ListMusic, Plus } from 'lucide-react-native';
import { AppModal } from '@/components/ui/AppModal';
import { BottomSheet, type SheetOption } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { usePlaylistStore } from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import { formatNumber, formatSongCount } from '@/utils/format';

interface AddToPlaylistSheetProps {
  visible: boolean;
  songIds: string[];
  onClose: () => void;
  onComplete?: () => void;
}

export function AddToPlaylistSheet({
  visible,
  songIds,
  onClose,
  onComplete,
}: AddToPlaylistSheetProps) {
  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongsToPlaylist);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleOpenCreate = () => {
    setNewPlaylistName('');
    setTimeout(() => setCreateModalVisible(true), 120);
  };

  const handleCreateAndAdd = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert('نام نامعتبر', 'لطفاً یک نام برای پلی‌لیست وارد کنید.');
      return;
    }

    const created = createPlaylist(trimmed);
    if (created && songIds.length > 0) {
      addSongsToPlaylist(created.id, songIds);
    }
    setCreateModalVisible(false);
    setNewPlaylistName('');
    onComplete?.();
  };

  const options: SheetOption[] = [
    {
      label: 'ساخت پلی‌لیست جدید',
      subtitle: 'ایجاد پلی‌لیست با آهنگ‌های انتخاب‌شده',
      accent: true,
      icon: (
        <View style={styles.createIconBadge}>
          <Plus size={16} color={Colors.textPrimary} />
        </View>
      ),
      onPress: handleOpenCreate,
    },
    ...playlists.map((pl) => ({
      label: pl.name,
      rightText: formatSongCount(pl.songCount),
      icon: <ListMusic size={18} color={Colors.accentSecondary} />,
      onPress: () => {
        if (songIds.length > 0) {
          addSongsToPlaylist(pl.id, songIds);
        }
        onComplete?.();
      },
    })),
  ];

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="افزودن به پلی‌لیست"
        subtitle={
          songIds.length > 1
            ? `${formatNumber(songIds.length)} آهنگ انتخاب شده`
            : undefined
        }
        options={options}
      />

      <AppModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="پلی‌لیست جدید"
      >
        <TextInput
          value={newPlaylistName}
          onChangeText={setNewPlaylistName}
          placeholder="نام پلی‌لیست را وارد کنید"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleCreateAndAdd}
          textAlign="right"
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setCreateModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>انصراف</Text>
          </Pressable>
          <PrimaryButton
            label="ساخت و افزودن"
            size="sm"
            onPress={handleCreateAndAdd}
          />
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  createIconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
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
