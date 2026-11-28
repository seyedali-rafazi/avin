import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
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
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { LibraryCategory, Song, SortField, SortOrder } from '@/types/music';
import { formatSongCount, localizeMetadata } from '@/utils/format';

const TITLES: Record<LibraryCategory, string> = {
  'all-songs': 'همه آهنگ‌ها',
  albums: 'آلبوم‌ها',
  artists: 'هنرمندان',
  genres: 'سبک‌ها',
  folders: 'پوشه‌ها',
  'recently-added': 'تازه اضافه‌شده',
  'recently-played': 'اخیراً پخش‌شده',
  'most-played': 'پرتکرارترین‌ها',
  'never-played': 'گوش‌نداده‌ها',
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
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const mostPlayed = useLibraryStore((s) => s.mostPlayed);
  const neverPlayed = useLibraryStore((s) => s.neverPlayed);
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
    activeCategory === 'all-songs' ||
    activeCategory === 'recently-added' ||
    activeCategory === 'recently-played' ||
    activeCategory === 'most-played' ||
    activeCategory === 'never-played';

  const activeSongList = useMemo(() => {
    if (activeCategory === 'all-songs') return songs;
    if (activeCategory === 'recently-added') {
      return sortSongsList(recentlyAdded, recentSortBy, recentSortOrder);
    }
    if (activeCategory === 'recently-played') return recentlyPlayed;
    if (activeCategory === 'most-played') return mostPlayed;
    if (activeCategory === 'never-played') return neverPlayed;
    return [];
  }, [
    activeCategory,
    songs,
    recentlyAdded,
    recentlyPlayed,
    mostPlayed,
    neverPlayed,
    recentSortBy,
    recentSortOrder,
  ]);

  const selection = useSongSelection(activeSongList);
  const currentSongId = currentSong?.id ?? null;

  const { isSelectionMode, toggleSelect, enterSelection } = selection;
  const songKeyExtractor = useCallback((item: Song) => item.id, []);
  const handleSongPress = useCallback(
    (song: Song, index: number) => {
      if (isSelectionMode) {
        toggleSelect(song.id);
      } else {
        void playQueue(activeSongList, index, false);
      }
    },
    [isSelectionMode, toggleSelect, playQueue, activeSongList]
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
          title="آهنگی پیدا نشد"
          description="حافظه دستگاه را اسکن کنید یا فایل‌های صوتی را اضافه کنید تا در کتابخانه نمایش داده شوند."
        />
      );
    }

    return (
      <FlatList
        data={list}
        keyExtractor={songKeyExtractor}
        ListHeaderComponent={
          <View style={styles.actionsRow}>
            <PrimaryButton
              label="پخش همه"
              icon={<Play size={15} color={Colors.textPrimary} fill={Colors.textPrimary} />}
              onPress={() => void playQueue(list, 0, false)}
              style={styles.flexBtn}
            />
            <Pressable
              onPress={() => void playQueue(list, 0, true)}
              style={({ pressed }) => [styles.shuffleBtn, pressed && styles.pressed]}
            >
              <Shuffle size={16} color={Colors.accentSecondary} />
              <Text style={styles.shuffleText}>پخش تصادفی</Text>
            </Pressable>
          </View>
        }
        renderItem={renderSongItem}
        removeClippedSubviews={false}
        initialNumToRender={15}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={9}
        contentContainerStyle={styles.listContent}
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
              title="آلبومی پیدا نشد"
              description="پس از اسکن کتابخانه موسیقی، آلبوم‌ها اینجا نمایش داده می‌شوند."
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
                      params: {
                        type: 'album',
                        value: item.title,
                        title: localizeMetadata(item.title, 'آلبوم ناشناس'),
                      },
                    })
                  }
                  style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
                >
                  <AlbumArtwork uri={item.artworkUri} size={156} borderRadius={Radii.md} />
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {localizeMetadata(item.title, 'آلبوم ناشناس')}
                  </Text>
                  <Text style={styles.albumSub} numberOfLines={1}>
                    {localizeMetadata(item.artist, 'هنرمند ناشناس')} •{' '}
                    {formatSongCount(item.songCount ?? 0)}
                  </Text>
                </Pressable>
              )}
            />
          ))}

        {activeCategory === 'artists' &&
          (artists.length === 0 ? (
            <EmptyState
              icon={<Users size={28} color={Colors.accent} />}
              title="هنرمندی پیدا نشد"
              description="پس از اسکن فایل‌های موسیقی، هنرمندان اینجا نمایش داده می‌شوند."
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
                      params: {
                        type: 'artist',
                        value: item.name,
                        title: localizeMetadata(item.name, 'هنرمند ناشناس'),
                      },
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
              title="سبکی پیدا نشد"
              description="پس از اسکن فایل‌های صوتی، سبک‌ها اینجا نمایش داده می‌شوند."
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
                      params: {
                        type: 'genre',
                        value: item.name,
                        title: localizeMetadata(item.name, 'سبک ناشناس'),
                      },
                    })
                  }
                  style={({ pressed }) => [styles.badgeCard, pressed && styles.cardPressed]}
                >
                  <View style={styles.iconBadge}>
                    <Tag size={19} color={Colors.accentSecondary} />
                  </View>
                  <View style={styles.badgeMeta}>
                    <Text style={styles.badgeTitle}>
                      {localizeMetadata(item.name, 'سبک ناشناس')}
                    </Text>
                    <Text style={styles.badgeSub}>{formatSongCount(item.songCount)}</Text>
                  </View>
                  <ChevronLeft size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            />
          ))}

        {activeCategory === 'folders' &&
          (folders.length === 0 ? (
            <EmptyState
              icon={<Folder size={28} color={Colors.accent} />}
              title="پوشه‌ای پیدا نشد"
              description="پوشه‌های حاوی موسیقی روی دستگاه شما اینجا نمایش داده می‌شوند."
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
                      params: {
                        type: 'folder',
                        value: item.path,
                        title: localizeMetadata(item.name, 'پوشه'),
                      },
                    })
                  }
                  style={({ pressed }) => [styles.badgeCard, pressed && styles.cardPressed]}
                >
                  <View style={styles.iconBadge}>
                    <Folder size={19} color={Colors.accentSecondary} />
                  </View>
                  <View style={styles.badgeMeta}>
                    <Text style={styles.badgeTitle} numberOfLines={1}>
                      {localizeMetadata(item.name, 'پوشه')}
                    </Text>
                    <Text style={styles.badgeSub} numberOfLines={1}>
                      {localizeMetadata(item.path, 'حافظه دستگاه')} •{' '}
                      {formatSongCount(item.songCount)}
                    </Text>
                  </View>
                  <ChevronLeft size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            />
          ))}
      </View>

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
  albumGrid: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 110,
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
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  albumSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
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
    alignItems: 'flex-start',
  },
  badgeTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  badgeSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
