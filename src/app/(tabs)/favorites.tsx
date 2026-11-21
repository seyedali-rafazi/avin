import React, { useMemo, useState } from 'react';
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
import { Colors, Layout, Spacing } from '@/theme';
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

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Favorites"
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
          title="No Favorite Songs Yet"
          description="Tap the heart icon while listening to any track to save it here for quick access."
        />
      ) : (
        <FlatList
          data={sortedFavorites}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.actionsRow}>
              <PrimaryButton
                label="Play All"
                icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
                onPress={() => void playQueue(sortedFavorites, 0, false)}
                style={styles.actionBtn}
              />
              <Pressable
                onPress={() => void playQueue(sortedFavorites, 0, true)}
                style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
              >
                <Shuffle size={16} color={Colors.accentSecondary} />
                <Text style={styles.shuffleText}>Shuffle</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              showAlbum
              isActive={currentSong?.id === item.id}
              selectionMode={selection.isSelectionMode}
              isSelected={selection.selectedIds.has(item.id)}
              onPress={() => {
                if (selection.isSelectionMode) {
                  selection.toggleSelect(item.id);
                } else {
                  void playQueue(sortedFavorites, index, false);
                }
              }}
              onLongPress={() => selection.enterSelection(item.id)}
              onMorePress={() => setSelectedSong(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            selection.isSelectionMode && styles.listWithSelectionBar,
          ]}
          initialNumToRender={16}
          maxToRenderPerBatch={20}
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
        title="Sort Favorites"
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
});
