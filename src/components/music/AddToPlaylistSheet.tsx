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
import { Colors, Radii, Spacing } from '@/theme';
import { formatSongCount } from '@/utils/format';

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
    // BottomSheet closes itself before calling option.onPress
    setTimeout(() => setCreateModalVisible(true), 120);
  };

  const handleCreateAndAdd = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter a playlist name.');
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
      label: 'Create Playlist',
      subtitle: 'Start a new playlist with selected audio',
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
        title="Add to Playlist"
        subtitle={
          songIds.length > 1
            ? `${songIds.length} songs selected`
            : undefined
        }
        options={options}
      />

      <AppModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="New Playlist"
      >
        <TextInput
          value={newPlaylistName}
          onChangeText={setNewPlaylistName}
          placeholder="Playlist name"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleCreateAndAdd}
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setCreateModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <PrimaryButton
            label="Create & Add"
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
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
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
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
