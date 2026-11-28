import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Music, Play, Shuffle } from 'lucide-react-native';
import {
  EmptyState,
  MiniPlayer,
  PrimaryButton,
  ScreenContainer,
  ScreenHeader,
  SelectionActionBar,
  SongOptionsSheet,
  SongRow,
  SortPill,
  SortSheet,
  sortSongsList,
} from '@/components';
import { songRepository } from '@/database/repositories';
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song, SortField, SortOrder } from '@/types/music';
import { formatSongCount, localizeMetadata } from '@/utils/format';

export default function LibraryDetailScreen() {
  const { type, value, title } = useLocalSearchParams<{
    type: 'album' | 'artist' | 'genre' | 'folder';
    value: string;
    title: string;
  }>();

  const librarySongs = useLibraryStore((s) => s.songs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortVisible, setSortVisible] = useState(false);

  const rawSongs = useMemo(() => {
    void librarySongs; // Recompute when library changes (e.g. delete)
    if (!value) return [];
    switch (type) {
      case 'album':
        return songRepository.getByAlbum(value);
      case 'artist':
        return songRepository.getByArtist(value);
      case 'genre':
        return songRepository.getByGenre(value);
      case 'folder':
        return songRepository.getByFolder(value);
      default:
        return [];
    }
  }, [type, value, librarySongs]);

  const songs = useMemo(
    () => sortSongsList(rawSongs, sortBy, sortOrder),
    [rawSongs, sortBy, sortOrder]
  );

  const selection = useSongSelection(songs);
  const currentSongId = currentSong?.id ?? null;

  const { isSelectionMode, toggleSelect, enterSelection } = selection;
  const keyExtractor = useCallback((item: Song) => item.id, []);
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
        showAlbum={type !== 'album'}
        isActive={currentSongId === item.id}
        selectionMode={selection.isSelectionMode}
        isSelected={selection.selectedIds.has(item.id)}
        onPressItem={handleSongPress}
        onLongPressItem={handleSongLongPress}
        onMorePressItem={handleSongMore}
      />
    ),
    [
      type,
      currentSongId,
      selection.isSelectionMode,
      selection.selectedIds,
      handleSongPress,
      handleSongLongPress,
      handleSongMore,
    ]
  );

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title={localizeMetadata(title ?? value, 'آهنگ‌ها')}
        subtitle={formatSongCount(songs.length)}
        onBack={() => router.back()}
        rightElement={
          songs.length > 0 ? (
            <SortPill
              sortBy={sortBy}
              sortOrder={sortOrder}
              onPress={() => setSortVisible(true)}
            />
          ) : undefined
        }
      />

      {songs.length === 0 ? (
        <EmptyState
          icon={<Music size={28} color={Colors.accent} />}
          title="آهنگی وجود ندارد"
          description="هیچ فایل صوتی در این مجموعه پیدا نشد."
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={keyExtractor}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          ListHeaderComponent={
            <View style={styles.actionsRow}>
              <PrimaryButton
                label="پخش همه"
                icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
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
      />

      <SortSheet
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelect={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
      />

      <SongOptionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.lg,
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
});
