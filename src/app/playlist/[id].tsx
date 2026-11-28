import React, { useCallback, useMemo, useState } from 'react';
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
  Edit3,
  ImagePlus,
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
  DraggableSongList,
  EmptyState,
  IconButton,
  MiniPlayer,
  PrimaryButton,
  ScreenContainer,
  ScreenHeader,
  SearchBar,
  SelectionActionBar,
  SongOptionsSheet,
  SongRow,
} from '@/components';
import { useSongSelection } from '@/hooks/useSongSelection';
import { fileActionsService } from '@/services/media/fileActionsService';
import { useLibraryStore, usePlayerStore, usePlaylistStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { formatNumber, formatSongCount, localizeMetadata } from '@/utils/format';
import { reorderList } from '@/utils/queue';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const playlists = usePlaylistStore((s) => s.playlists);
  const getPlaylistSongs = usePlaylistStore((s) => s.getPlaylistSongs);
  const addSongsToPlaylist = usePlaylistStore((s) => s.addSongsToPlaylist);
  const removeSongFromPlaylist = usePlaylistStore((s) => s.removeSongFromPlaylist);
  const reorderPlaylistSongs = usePlaylistStore((s) => s.reorderPlaylistSongs);
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const updatePlaylistArtwork = usePlaylistStore((s) => s.updatePlaylistArtwork);
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
    if (!id || !playlist) return [];
    return getPlaylistSongs(id);
  }, [id, playlist, getPlaylistSongs, refreshTick]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState(playlist?.name ?? '');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const selection = useSongSelection(songs);
  const currentSongId = currentSong?.id ?? null;

  const { isSelectionMode, toggleSelect, enterSelection } = selection;
  const songKeyExtractor = useCallback((item: Song) => item.id, []);
  const handleSongPress = useCallback(
    (song: Song, index: number) => {
      if (isSelectionMode) {
        toggleSelect(song.id);
      } else {
        void playQueue(songs, index, false);
      }
    },
    [isSelectionMode, toggleSelect, playQueue, songs]
  );
  const handleSongLongPress = useCallback(
    (song: Song) => enterSelection(song.id),
    [enterSelection]
  );
  const handleSongMore = useCallback((song: Song) => setSelectedSong(song), []);
  const renderSongItem = useCallback(
    ({ item, index }: { item: Song; index: number }) => (
      <SongRow
        song={item}
        index={index}
        showAlbum
        isActive={currentSongId === item.id}
        selectionMode={selection.isSelectionMode}
        isSelected={selection.selectedIds.has(item.id)}
        onPressItem={handleSongPress}
        onLongPressItem={handleSongLongPress}
        onMorePressItem={handleSongMore}
      />
    ),
    [
      currentSongId,
      selection.isSelectionMode,
      selection.selectedIds,
      handleSongPress,
      handleSongLongPress,
      handleSongMore,
    ]
  );

  const existingIds = useMemo(() => new Set(songs.map((s) => s.id)), [songs]);

  const availableToAdd = useMemo(() => {
    const q = addSearchQuery.trim().toLowerCase();
    return allLibrarySongs.filter((s) => {
      if (existingIds.has(s.id)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
      );
    });
  }, [allLibrarySongs, existingIds, addSearchQuery]);

  if (!playlist || !id) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <ScreenHeader title="پلی‌لیست" onBack={() => router.back()} />
        <EmptyState
          icon={<ListMusic size={28} color={Colors.accent} />}
          title="پلی‌لیست پیدا نشد"
          description="ممکن است این پلی‌لیست حذف شده باشد."
        />
      </ScreenContainer>
    );
  }

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
    setAddSearchQuery('');
    setAddModalVisible(false);
  };

  const handleReorderSong = (fromIndex: number, toIndex: number) => {
    const nextOrder = reorderList(songs, fromIndex, toIndex).map((s) => s.id);
    reorderPlaylistSongs(id, nextOrder);
    setRefreshTick((t) => t + 1);
  };

  const handleChangeArtwork = async () => {
    const uri = await fileActionsService.pickCustomArtwork(id);
    if (uri) {
      updatePlaylistArtwork(id, uri);
    }
  };

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renamePlaylist(id, trimmed);
    setRenameModalVisible(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'حذف پلی‌لیست',
      `پلی‌لیست «${playlist.name}» حذف شود؟ فایل‌های صوتی شما روی دستگاه باقی می‌مانند.`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
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
        subtitle={
          reorderMode
            ? 'حالت چیدمان • دستگیره را بکشید'
            : formatSongCount(songs.length)
        }
        onBack={() => router.back()}
        rightElement={
          <View style={styles.headerActions}>
            {reorderMode ? (
              <Pressable
                onPress={() => setReorderMode(false)}
                style={styles.doneReorderBtn}
              >
                <Text style={styles.doneReorderText}>ذخیره</Text>
              </Pressable>
            ) : (
              <>
                <IconButton
                  icon={<Plus size={22} color={Colors.textPrimary} />}
                  onPress={() => setAddModalVisible(true)}
                  accessibilityLabel="افزودن آهنگ به پلی‌لیست"
                />
                <IconButton
                  icon={<MoreVertical size={20} color={Colors.textPrimary} />}
                  onPress={() => setMenuVisible(true)}
                  accessibilityLabel="گزینه‌های پلی‌لیست"
                />
              </>
            )}
          </View>
        }
      />

      {songs.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={30} color={Colors.accent} />}
          title="این پلی‌لیست خالی است"
          description="آهنگ‌های دلخواهتان را از کتابخانه به این پلی‌لیست اضافه کنید."
          actionLabel="افزودن آهنگ"
          onAction={() => setAddModalVisible(true)}
        />
      ) : reorderMode ? (
        <DraggableSongList
          songs={songs}
          currentSongId={currentSong?.id ?? null}
          onPressSong={(idx) => void playQueue(songs, idx, false)}
          onReorder={handleReorderSong}
          onRemoveSong={(idx) => {
            const target = songs[idx];
            if (target) {
              removeSongFromPlaylist(id, target.id);
              setRefreshTick((t) => t + 1);
            }
          }}
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={songKeyExtractor}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          ListHeaderComponent={
            <View style={styles.heroHeader}>
              <Pressable onPress={() => void handleChangeArtwork()}>
                <AlbumArtwork
                  uri={playlist.artworkUri}
                  size={156}
                  borderRadius={Radii.xl}
                  iconSize={52}
                />
              </Pressable>
              <View style={styles.actionsRow}>
                <PrimaryButton
                  label="پخش"
                  icon={
                    <Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />
                  }
                  onPress={() => void playQueue(songs, 0, false)}
                  style={styles.flexBtn}
                />
                <Pressable
                  onPress={() => void playQueue(songs, 0, true)}
                  style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
                >
                  <Shuffle size={16} color={Colors.accentSecondary} />
                  <Text style={styles.shuffleText}>پخش تصادفی</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={renderSongItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <MiniPlayer />

      <SelectionActionBar
        selectedSongs={selection.selectedSongs}
        allSelected={selection.allSelected}
        onToggleSelectAll={() =>
          selection.allSelected ? selection.clearSelection() : selection.selectAll()
        }
        onCancel={selection.clearSelection}
        deleteLabel="حذف"
        onCustomDelete={(chosen) => {
          Alert.alert(
            'حذف از پلی‌لیست',
            `${formatSongCount(chosen.length)} از پلی‌لیست «${playlist.name}» حذف شود؟`,
            [
              { text: 'انصراف', style: 'cancel' },
              {
                text: 'حذف',
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
            label: 'افزودن آهنگ',
            icon: <Plus size={18} color={Colors.textPrimary} />,
            onPress: () => setAddModalVisible(true),
          },
          {
            label: 'تغییر ترتیب آهنگ‌ها (Drag & Drop)',
            icon: <ListMusic size={18} color={Colors.accentSecondary} />,
            onPress: () => setReorderMode(true),
          },
          {
            label: 'تغییر کاور پلی‌لیست',
            icon: <ImagePlus size={18} color={Colors.textPrimary} />,
            onPress: () => void handleChangeArtwork(),
          },
          {
            label: 'تغییر نام پلی‌لیست',
            icon: <Edit3 size={18} color={Colors.textPrimary} />,
            onPress: () => {
              setRenameValue(playlist.name);
              setRenameModalVisible(true);
            },
          },
          {
            label: 'حذف پلی‌لیست',
            icon: <Trash2 size={18} color={Colors.danger} />,
            destructive: true,
            onPress: handleDelete,
          },
        ]}
      />

      {/* Add Songs Sheet with Live Search & Unlimited FlatList */}
      <BottomSheet
        visible={addModalVisible}
        onClose={() => {
          setSelectedToAdd(new Set());
          setAddSearchQuery('');
          setAddModalVisible(false);
        }}
        title="افزودن آهنگ"
        subtitle={
          selectedToAdd.size > 0
            ? `${formatNumber(selectedToAdd.size)} آهنگ انتخاب شده`
            : 'آهنگ‌ها را از کتابخانه جستجو و انتخاب کنید'
        }
      >
        <View style={styles.pickerSearchWrap}>
          <SearchBar
            value={addSearchQuery}
            onChangeText={setAddSearchQuery}
            placeholder="جستجوی آهنگ، هنرمند یا آلبوم..."
          />
        </View>

        {availableToAdd.length === 0 ? (
          <View style={styles.emptyPicker}>
            <Text style={styles.emptyPickerText}>
              {addSearchQuery.trim()
                ? 'آهنگی با این عبارت پیدا نشد.'
                : 'همه آهنگ‌های کتابخانه در حال حاضر در این پلی‌لیست وجود دارند.'}
            </Text>
          </View>
        ) : (
          <View>
            <FlatList
              data={availableToAdd}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              renderItem={({ item: song }) => {
                const checked = selectedToAdd.has(song.id);
                return (
                  <Pressable
                    onPress={() => toggleSelectAdd(song.id)}
                    style={styles.pickerRow}
                  >
                    <AlbumArtwork uri={song.artworkUri} size={40} borderRadius={6} />
                    <View style={styles.pickerMeta}>
                      <Text style={styles.pickerTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.pickerArtist} numberOfLines={1}>
                        {localizeMetadata(song.artist, 'هنرمند ناشناس')}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Check size={14} color={Colors.textPrimary} /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
            <View style={styles.pickerFooter}>
              <PrimaryButton
                label={
                  selectedToAdd.size > 0
                    ? `افزودن (${formatNumber(selectedToAdd.size)})`
                    : 'افزودن'
                }
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
        title="تغییر نام پلی‌لیست"
      >
        <TextInput
          value={renameValue}
          onChangeText={setRenameValue}
          placeholder="نام جدید پلی‌لیست"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
          textAlign="right"
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setRenameModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>انصراف</Text>
          </Pressable>
          <PrimaryButton label="ذخیره" size="sm" onPress={handleRename} />
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
  doneReorderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.accent,
  },
  doneReorderText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    color: Colors.textPrimary,
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
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.78,
  },
  listContent: {
    paddingBottom: 150,
  },
  pickerSearchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  pickerList: {
    maxHeight: 310,
  },
  emptyPicker: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 22,
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
    alignItems: 'flex-start',
  },
  pickerTitle: {
    fontFamily: Fonts.medium,
    color: Colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pickerArtist: {
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
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
