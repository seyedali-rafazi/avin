import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Edit3, Plus, Trash2 } from 'lucide-react-native';
import {
  AppModal,
  BottomSheet,
  CreatePlaylistCard,
  IconButton,
  PlaylistCard,
  PrimaryButton,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { useLibraryStore, usePlaylistStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Playlist } from '@/types/music';

export default function PlaylistsScreen() {
  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const favoriteCount = useLibraryStore((s) => s.favoriteSongs.length);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [menuPlaylist, setMenuPlaylist] = useState<Playlist | null>(null);
  const [playlistName, setPlaylistName] = useState('');

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setPlaylistName('');
    setCreateModalVisible(true);
  };

  const openRenameModal = (pl: Playlist) => {
    setEditingPlaylist(pl);
    setPlaylistName(pl.name);
    setCreateModalVisible(true);
  };

  const handleSavePlaylist = () => {
    const trimmed = playlistName.trim();
    if (!trimmed) {
      Alert.alert('نام نامعتبر', 'لطفاً یک نام برای پلی‌لیست وارد کنید.');
      return;
    }

    if (editingPlaylist) {
      renamePlaylist(editingPlaylist.id, trimmed);
    } else {
      createPlaylist(trimmed);
    }
    setCreateModalVisible(false);
    setPlaylistName('');
    setEditingPlaylist(null);
  };

  const confirmDelete = (pl: Playlist) => {
    Alert.alert(
      'حذف پلی‌لیست',
      `آیا مطمئن هستید که می‌خواهید پلی‌لیست «${pl.name}» را حذف کنید؟ فایل‌های صوتی شما از دستگاه حذف نمی‌شوند.`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => deletePlaylist(pl.id),
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="پلی‌لیست‌ها"
        rightElement={
          <IconButton
            icon={<Plus size={24} color={Colors.textPrimary} />}
            onPress={openCreateModal}
            accessibilityLabel="ساخت پلی‌لیست جدید"
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
      >
        <View style={styles.grid}>
          {/* Favorites Card always first */}
          <View style={styles.gridItem}>
            <PlaylistCard
              title="علاقه‌مندی‌ها"
              songCount={favoriteCount}
              isFavorites
              artworkHeight={124}
              onPress={() => router.push('/(tabs)/favorites')}
            />
          </View>

          {playlists.map((pl) => (
            <View key={pl.id} style={styles.gridItem}>
              <PlaylistCard
                title={pl.name}
                songCount={pl.songCount}
                artworkUri={pl.artworkUri}
                coverUris={pl.coverUris}
                artworkHeight={124}
                onPress={() =>
                  router.push({
                    pathname: '/playlist/[id]',
                    params: { id: pl.id },
                  })
                }
                onLongPress={() => setMenuPlaylist(pl)}
              />
            </View>
          ))}

          {/* Dashed Create Playlist Card */}
          <View style={styles.gridItem}>
            <CreatePlaylistCard height={184} onPress={openCreateModal} />
          </View>
        </View>
      </ScrollView>

      <AppModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title={editingPlaylist ? 'تغییر نام پلی‌لیست' : 'پلی‌لیست جدید'}
      >
        <TextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="نام پلی‌لیست را وارد کنید"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleSavePlaylist}
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
            label={editingPlaylist ? 'ذخیره' : 'ساختن'}
            size="sm"
            onPress={handleSavePlaylist}
          />
        </View>
      </AppModal>

      <BottomSheet
        visible={Boolean(menuPlaylist)}
        onClose={() => setMenuPlaylist(null)}
        title={menuPlaylist?.name}
        options={
          menuPlaylist
            ? [
                {
                  label: 'تغییر نام پلی‌لیست',
                  icon: <Edit3 size={18} color={Colors.textPrimary} />,
                  onPress: () => openRenameModal(menuPlaylist),
                },
                {
                  label: 'حذف پلی‌لیست',
                  icon: <Trash2 size={18} color={Colors.danger} />,
                  destructive: true,
                  onPress: () => confirmDelete(menuPlaylist),
                },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 110,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  gridItem: {
    width: '48%',
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
