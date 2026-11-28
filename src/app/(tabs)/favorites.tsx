import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, Play, Shuffle } from 'lucide-react-native';
import {
  EmptyState,
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
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Spacing } from '@/theme';
import type { Song, SortField, SortOrder } from '@/types/music';
import { formatSongCount } from '@/utils/format';

export default function FavoritesScreen() {
  const favoriteSongs = useLibraryStore((s) => s.favoriteSongs);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [sortBy, setSortBy] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const sortedFavorites = useMemo(
    () => sortSongsList(favoriteSongs, sortBy, sortOrder),
    [favoriteSongs, sortBy, sortOrder]
  );

  const selection = useSongSelection(sortedFavorites);
  const currentSongId = currentSong?.id ?? null;

  const { isSelectionMode, toggleSelect, enterSelection } = selection;
  const keyExtractor = useCallback((item: Song) => item.id, []);
  const handleSongPress = useCallback(
    (song: Song, index: number) => {
      if (isSelectionMode) {
        toggleSelect(song.id);
      } else {
        void playQueue(sortedFavorites, index, false);
      }
    },
    [isSelectionMode, toggleSelect, playQueue, sortedFavorites]
  );
  const handleSongLongPress = useCallback(
    (song: Song) => enterSelection(song.id),
    [enterSelection]
  );
  const handleSongMore = useCallback((song: Song) => setSelectedSong(song), []);
  const renderItem = useCallback(
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

  return (
    <ScreenContainer>
      <ScreenHeader
        title="علاقه‌مندی‌ها"
        subtitle={formatSongCount(sortedFavorites.length)}
        rightElement={
          sortedFavorites.length > 0 ? (
            <SortPill
              sortBy={sortBy}
              sortOrder={sortOrder}
              onPress={() => setSortSheetVisible(true)}
            />
          ) : undefined
        }
      />

      {sortedFavorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={30} color={Colors.accent} />}
          title="هنوز آهنگ موردعلاقه‌ای ندارید"
          description="هنگام گوش دادن به هر آهنگ، آیکون قلب را لمس کنید تا برای دسترسی سریع اینجا ذخیره شود."
        />
      ) : (
        <FlatList
          data={sortedFavorites}
          keyExtractor={keyExtractor}
          ListHeaderComponent={
            <View style={styles.actionsRow}>
              <PrimaryButton
                label="پخش همه"
                icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
                onPress={() => void playQueue(sortedFavorites, 0, false)}
                style={styles.actionBtn}
              />
              <Pressable
                onPress={() => void playQueue(sortedFavorites, 0, true)}
                style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
              >
                <Shuffle size={16} color={Colors.accentSecondary} />
                <Text style={styles.shuffleText}>پخش تصادفی</Text>
              </Pressable>
            </View>
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={9}
        />
      )}

      <SelectionActionBar
        selectedSongs={selection.selectedSongs}
        allSelected={selection.allSelected}
        onToggleSelectAll={() =>
          selection.allSelected ? selection.clearSelection() : selection.selectAll()
        }
        onCancel={selection.clearSelection}
        insideTabScreen
      />

      <SortSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        title="مرتب‌سازی علاقه‌مندی‌ها"
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
  actionBtn: {
    flex: 1,
  },
  shuffleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 9999,
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
