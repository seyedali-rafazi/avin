import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronRight,
  Clock,
  Disc,
  Folder,
  Music,
  Play,
  Shuffle,
  Tag,
  Users,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  ArtistCard,
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
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { LibraryCategory, Song, SortField, SortOrder } from '@/types/music';
import { formatSongCount } from '@/utils/format';

const TITLES: Record<LibraryCategory, string> = {
  'all-songs': 'All Songs',
  albums: 'Albums',
  artists: 'Artists',
  genres: 'Genres',
  folders: 'Folders',
  'recently-added': 'Recently Added',
};

export default function LibraryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: LibraryCategory }>();
  const activeCategory: LibraryCategory =
    category && category in TITLES ? category : 'all-songs';

  const songs = useLibraryStore((s) => s.songs);
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);
  const genres = useLibraryStore((s) => s.genres);
  const folders = useLibraryStore((s) => s.folders);
  const recentlyAdded = useLibraryStore((s) => s.recentlyAdded);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const sortOrder = useLibraryStore((s) => s.sortOrder);
  const setSorting = useLibraryStore((s) => s.setSorting);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [sortVisible, setSortVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [recentSortBy, setRecentSortBy] = useState<SortField>('dateAdded');
  const [recentSortOrder, setRecentSortOrder] = useState<SortOrder>('desc');

  const isSongCategory =
    activeCategory === 'all-songs' || activeCategory === 'recently-added';

  const activeSongList = useMemo(() => {
    if (activeCategory === 'all-songs') return songs;
    if (activeCategory === 'recently-added') {
      return sortSongsList(recentlyAdded, recentSortBy, recentSortOrder);
    }
    return [];
  }, [activeCategory, songs, recentlyAdded, recentSortBy, recentSortOrder]);

  const selection = useSongSelection(activeSongList);

  const activeSortBy = activeCategory === 'recently-added' ? recentSortBy : sortBy;
  const activeSortOrder =
    activeCategory === 'recently-added' ? recentSortOrder : sortOrder;

  const handleSortSelect = (field: SortField, order: SortOrder) => {
    if (activeCategory === 'recently-added') {
      setRecentSortBy(field);
      setRecentSortOrder(order);
    } else {
      setSorting(field, order);
    }
  };

  const renderSongList = (list: Song[]) => {
    if (list.length === 0) {
      return (
        <EmptyState
          icon={
            activeCategory === 'recently-added' ? (
              <Clock size={28} color={Colors.accent} />
            ) : (
              <Music size={28} color={Colors.accent} />
            )
          }
          title="No Songs Found"
          description="Scan your device or import audio files to populate your music library."
        />
      );
    }

    return (
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.actionsRow}>
            <PrimaryButton
              label="Play All"
              icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
              onPress={() => void playQueue(list, 0, false)}
              style={styles.flexBtn}
            />
            <Pressable
              onPress={() => void playQueue(list, 0, true)}
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
                void playQueue(list, index, false);
              }
            }}
            onLongPress={() => selection.enterSelection(item.id)}
            onMorePress={() => setSelectedSong(item)}
          />
        )}
        initialNumToRender={18}
        maxToRenderPerBatch={24}
        windowSize={11}
        contentContainerStyle={[
          styles.listContent,
          selection.isSelectionMode && styles.listWithSelectionBar,
        ]}
      />
    );
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title={TITLES[activeCategory]}
        subtitle={isSongCategory ? formatSongCount(activeSongList.length) : undefined}
        onBack={() => router.back()}
        rightElement={
          isSongCategory ? (
            <SortPill
              sortBy={activeSortBy}
              sortOrder={activeSortOrder}
              onPress={() => setSortVisible(true)}
            />
          ) : undefined
        }
      />

      <View style={styles.body}>
        {isSongCategory && renderSongList(activeSongList)}

        {activeCategory === 'albums' &&
          (albums.length === 0 ? (
            <EmptyState
              icon={<Disc size={28} color={Colors.accent} />}
              title="No Albums Found"
              description="Albums will appear here once your local music library is scanned."
            />
          ) : (
            <FlatList
              data={albums}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.albumRow}
              contentContainerStyle={styles.albumGrid}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'album', value: item.title, title: item.title },
                    })
                  }
                  style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
                >
                  <AlbumArtwork uri={item.artworkUri} size={156} borderRadius={Radii.md} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.albumSub} numberOfLines={1}>
                    {item.artist} • {formatSongCount(item.songCount ?? 0)}
                  </Text>
                </Pressable>
              )}
            />
          ))}

        {activeCategory === 'artists' &&
          (artists.length === 0 ? (
            <EmptyState
              icon={<Users size={28} color={Colors.accent} />}
              title="No Artists Found"
              description="Artists will appear here once your music files are scanned."
            />
          ) : (
            <FlatList
              data={artists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ArtistCard
                  artist={item}
                  onPress={() =>
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'artist', value: item.name, title: item.name },
                    })
                  }
                />
              )}
            />
          ))}

        {activeCategory === 'genres' &&
          (genres.length === 0 ? (
            <EmptyState
              icon={<Tag size={28} color={Colors.accent} />}
              title="No Genres Found"
              description="Genres will appear here once your local audio files are scanned."
            />
          ) : (
            <FlatList
              data={genres}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.simpleList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'genre', value: item.name, title: item.name },
                    })
                  }
                  style={({ pressed }) => [styles.badgeCard, pressed && styles.cardPressed]}
                >
                  <View style={styles.iconBadge}>
                    <Tag size={19} color={Colors.accentSecondary} />
                  </View>
                  <View style={styles.badgeMeta}>
                    <Text style={styles.badgeTitle}>{item.name}</Text>
                    <Text style={styles.badgeSub}>{formatSongCount(item.songCount)}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            />
          ))}

        {activeCategory === 'folders' &&
          (folders.length === 0 ? (
            <EmptyState
              icon={<Folder size={28} color={Colors.accent} />}
              title="No Folders Found"
              description="Audio folders discovered on your device will appear here."
            />
          ) : (
            <FlatList
              data={folders}
              keyExtractor={(item) => item.path}
              contentContainerStyle={styles.simpleList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'folder', value: item.path, title: item.name },
                    })
                  }
                  style={({ pressed }) => [styles.badgeCard, pressed && styles.cardPressed]}
                >
                  <View style={styles.iconBadge}>
                    <Folder size={19} color={Colors.accentSecondary} />
                  </View>
                  <View style={styles.badgeMeta}>
                    <Text style={styles.badgeTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.badgeSub} numberOfLines={1}>
                      {item.path} • {formatSongCount(item.songCount)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            />
          ))}
      </View>

      {!selection.isSelectionMode ? <MiniPlayer /> : null}

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
        sortBy={activeSortBy}
        sortOrder={activeSortOrder}
        onSelect={handleSortSelect}
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
  body: {
    flex: 1,
  },
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
  albumGrid: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  albumRow: {
    justifyContent: 'space-between',
  },
  albumCard: {
    width: '48%',
    alignItems: 'flex-start',
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  albumSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  simpleList: {
    paddingHorizontal: Layout.screenPadding,
    gap: 10,
    paddingBottom: Spacing.xxl,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.surfaceIconBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMeta: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badgeSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
