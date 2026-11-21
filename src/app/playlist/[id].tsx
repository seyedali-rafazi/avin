import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ListMusic,
  MoreVertical,
  Play,
  Plus,
  Shuffle,
  Trash2,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  AppModal,
  BottomSheet,
  EmptyState,
  IconButton,
  MiniPlayer,
  PrimaryButton,
  ScreenContainer,
  ScreenHeader,
  SelectionActionBar,
  SongOptionsSheet,
  SongRow,
} from '@/components';
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore, usePlaylistStore } from '@/stores';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { formatSongCount } from '@/utils/format';
import { reorderList } from '@/utils/queue';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const playlists = usePlaylistStore((s) => s.playlists);
  const getPlaylistSongs = usePlaylistStore((s) => s.getPlaylistSongs);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongsToPlaylist);
  const removeSongFromPlaylist = usePlaylistStore((s) => s.removeSongFromPlaylist);
  const reorderPlaylistSongs = usePlaylistStore((s) => s.reorderPlaylistSongs);
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);

  const allLibrarySongs = useLibraryStore((s) => s.songs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const playlist = useMemo(
    () => playlists.find((p) => p.id === id) ?? null,
    [playlists, id]
  );

  const [refreshTick, setRefreshTick] = useState(0);
  const songs = useMemo(() => {
    void refreshTick;
    return id ? getPlaylistSongs(id) : [];
  }, [id, getPlaylistSongs, playlists, refreshTick]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState(playlist?.name ?? '');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const selection = useSongSelection(songs);

  if (!playlist || !id) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <ScreenHeader title="Playlist" onBack={() => router.back()} />
        <EmptyState
          icon={<ListMusic size={28} color={Colors.accent} />}
          title="Playlist Not Found"
          description="This playlist may have been deleted."
        />
      </ScreenContainer>
    );
  }

  const existingIds = new Set(songs.map((s) => s.id));
  const availableToAdd = allLibrarySongs.filter((s) => !existingIds.has(s.id));

  const toggleSelectAdd = (songId: string) => {
    const next = new Set(selectedToAdd);
    if (next.has(songId)) {
      next.delete(songId);
    } else {
      next.add(songId);
    }
    setSelectedToAdd(next);
  };

  const handleConfirmAddSongs = () => {
    if (selectedToAdd.size > 0) {
      addSongsToPlaylist(id, Array.from(selectedToAdd));
      setRefreshTick((t) => t + 1);
    }
    setSelectedToAdd(new Set());
    setAddModalVisible(false);
  };

  const handleMoveSong = (fromIndex: number, toIndex: number) => {
    const nextOrder = reorderList(songs, fromIndex, toIndex).map((s) => s.id);
    reorderPlaylistSongs(id, nextOrder);
    setRefreshTick((t) => t + 1);
  };

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renamePlaylist(id, trimmed);
    setRenameModalVisible(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Playlist',
      `Delete "${playlist.name}"? Your audio files will remain on your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title={playlist.name}
        subtitle={formatSongCount(songs.length)}
        onBack={() => router.back()}
        rightElement={
          <View style={styles.headerActions}>
            <IconButton
              icon={<Plus size={22} color={Colors.textPrimary} />}
              onPress={() => setAddModalVisible(true)}
              accessibilityLabel="Add songs to playlist"
            />
            <IconButton
              icon={<MoreVertical size={20} color={Colors.textPrimary} />}
              onPress={() => setMenuVisible(true)}
              accessibilityLabel="Playlist options"
            />
          </View>
        }
      />

      {songs.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={30} color={Colors.accent} />}
          title="No Songs in Playlist"
          description="Add tracks from your library to build this playlist."
          actionLabel="Add Songs"
          onAction={() => setAddModalVisible(true)}
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.heroHeader}>
              <AlbumArtwork
                uri={playlist.artworkUri}
                size={156}
                borderRadius={Radii.xl}
                iconSize={52}
              />
              <View style={styles.actionsRow}>
                <PrimaryButton
                  label="Play"
                  icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
                  onPress={() => void playQueue(songs, 0, false)}
                  style={styles.flexBtn}
                />
                <Pressable
                  onPress={() => void playQueue(songs, 0, true)}
                  style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
                >
                  <Shuffle size={16} color={Colors.accentSecondary} />
                  <Text style={styles.shuffleText}>Shuffle</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              showAlbum
              isActive={currentSong?.id === item.id}
              selectionMode={!reorderMode && selection.isSelectionMode}
              isSelected={!reorderMode && selection.selectedIds.has(item.id)}
              onPress={() => {
                if (!reorderMode && selection.isSelectionMode) {
                  selection.toggleSelect(item.id);
                } else {
                  void playQueue(songs, index, false);
                }
              }}
              onLongPress={reorderMode ? undefined : () => selection.enterSelection(item.id)}
              onMorePress={reorderMode ? undefined : () => setSelectedSong(item)}
              rightElement={
                reorderMode ? (
                  <View style={styles.reorderControls}>
                    <Pressable
                      onPress={() => handleMoveSong(index, index - 1)}
                      disabled={index === 0}
                      hitSlop={8}
                    >
                      <ChevronUp
                        size={18}
                        color={index === 0 ? Colors.border : Colors.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveSong(index, index + 1)}
                      disabled={index === songs.length - 1}
                      hitSlop={8}
                    >
                      <ChevronDown
                        size={18}
                        color={
                          index === songs.length - 1 ? Colors.border : Colors.textPrimary
                        }
                      />
                    </Pressable>
                  </View>
                ) : undefined
              }
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            selection.isSelectionMode && styles.listWithSelectionBar,
          ]}
        />
      )}

      {!selection.isSelectionMode ? <MiniPlayer /> : null}

      <SelectionActionBar
        selectedSongs={selection.selectedSongs}
        allSelected={selection.allSelected}
        onToggleSelectAll={() =>
          selection.allSelected ? selection.clearSelection() : selection.selectAll()
        }
        onCancel={selection.clearSelection}
        deleteLabel="Remove"
        onCustomDelete={(chosen) => {
          Alert.alert(
            'Remove from Playlist',
            `Remove ${chosen.length} ${chosen.length === 1 ? 'song' : 'songs'} from "${playlist.name}"?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => {
                  for (const s of chosen) {
                    removeSongFromPlaylist(id, s.id);
                  }
                  setRefreshTick((t) => t + 1);
                  selection.clearSelection();
                },
              },
            ]
          );
        }}
      />

      <BottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={playlist.name}
        options={[
          {
            label: 'Add Songs',
            icon: <Plus size={18} color={Colors.textPrimary} />,
            onPress: () => setAddModalVisible(true),
          },
          {
            label: reorderMode ? 'Done Reordering' : 'Reorder Songs',
            icon: <ListMusic size={18} color={Colors.accentSecondary} />,
            onPress: () => setReorderMode((v) => !v),
          },
          {
            label: 'Rename Playlist',
            icon: <Edit3 size={18} color={Colors.textPrimary} />,
            onPress: () => {
              setRenameValue(playlist.name);
              setRenameModalVisible(true);
            },
          },
          {
            label: 'Delete Playlist',
            icon: <Trash2 size={18} color={Colors.danger} />,
            destructive: true,
            onPress: handleDelete,
          },
        ]}
      />

      {/* Add Songs Sheet */}
      <BottomSheet
        visible={addModalVisible}
        onClose={() => {
          setSelectedToAdd(new Set());
          setAddModalVisible(false);
        }}
        title="Add Songs"
        subtitle={
          selectedToAdd.size > 0
            ? `${selectedToAdd.size} selected`
            : 'Select tracks from your library'
        }
      >
        {availableToAdd.length === 0 ? (
          <View style={styles.emptyPicker}>
            <Text style={styles.emptyPickerText}>
              All songs from your library are already in this playlist.
            </Text>
          </View>
        ) : (
          <View>
            {availableToAdd.slice(0, 100).map((song) => {
              const checked = selectedToAdd.has(song.id);
              return (
                <Pressable
                  key={song.id}
                  onPress={() => toggleSelectAdd(song.id)}
                  style={styles.pickerRow}
                >
                  <AlbumArtwork uri={song.artworkUri} size={40} borderRadius={6} />
                  <View style={styles.pickerMeta}>
                    <Text style={styles.pickerTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.pickerArtist} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Check size={14} color={Colors.textPrimary} /> : null}
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.pickerFooter}>
              <PrimaryButton
                label={`Add ${selectedToAdd.size > 0 ? `(${selectedToAdd.size})` : ''}`}
                disabled={selectedToAdd.size === 0}
                onPress={handleConfirmAddSongs}
              />
            </View>
          </View>
        )}
      </BottomSheet>

      <AppModal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        title="Rename Playlist"
      >
        <TextInput
          value={renameValue}
          onChangeText={setRenameValue}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setRenameModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <PrimaryButton label="Save" size="sm" onPress={handleRename} />
        </View>
      </AppModal>

      <SongOptionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
        onRemoveFromPlaylist={
          selectedSong
            ? () => {
                removeSongFromPlaylist(id, selectedSong.id);
                setRefreshTick((t) => t + 1);
              }
            : undefined
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHeader: {
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
  shuffleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.full,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shuffleText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  listWithSelectionBar: {
    paddingBottom: 150,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyPicker: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyPickerText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    gap: Spacing.md,
  },
  pickerMeta: {
    flex: 1,
  },
  pickerTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  pickerArtist: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pickerFooter: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
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
