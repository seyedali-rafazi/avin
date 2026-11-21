import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  Clock,
  Disc,
  Folder,
  FolderPlus,
  Music,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  User,
  Users,
} from 'lucide-react-native';
import {
  BottomSheet,
  ScreenContainer,
  ScreenHeader,
  SearchBar,
  SectionHeader,
  SelectionActionBar,
  SongOptionsSheet,
  SongRow,
} from '@/components';
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { LibraryCategory, Song, SortField } from '@/types/music';
import { formatCount, formatSongCount } from '@/utils/format';

export default function LibraryScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);
  const genres = useLibraryStore((s) => s.genres);
  const folders = useLibraryStore((s) => s.folders);
  const recentlyAdded = useLibraryStore((s) => s.recentlyAdded);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const sortOrder = useLibraryStore((s) => s.sortOrder);
  const setSorting = useLibraryStore((s) => s.setSorting);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const scanDevice = useLibraryStore((s) => s.scanDevice);
  const importFiles = useLibraryStore((s) => s.importFiles);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const categories: {
    key: LibraryCategory;
    title: string;
    subtitle: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }[] = [
    {
      key: 'all-songs',
      title: 'All Songs',
      subtitle: formatSongCount(songs.length),
      Icon: Music,
    },
    {
      key: 'albums',
      title: 'Albums',
      subtitle: formatCount(albums.length, 'album', 'albums'),
      Icon: Disc,
    },
    {
      key: 'artists',
      title: 'Artists',
      subtitle: formatCount(artists.length, 'artist', 'artists'),
      Icon: Users,
    },
    {
      key: 'genres',
      title: 'Genres',
      subtitle: formatCount(genres.length, 'genre', 'genres'),
      Icon: Tag,
    },
    {
      key: 'folders',
      title: 'Folders',
      subtitle: formatCount(folders.length, 'folder', 'folders'),
      Icon: Folder,
    },
    {
      key: 'recently-added',
      title: 'Recently Added',
      subtitle: formatSongCount(recentlyAdded.length),
      Icon: Clock,
    },
  ];

  const handleSort = (field: SortField) => {
    const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSorting(field, nextOrder);
  };

  const handleRescan = async () => {
    const res = await scanDevice();
    if (res.requiresDevBuild) {
      Alert.alert(
        'Development Build Required',
        res.error ?? 'Use Import Files to load local audio in Expo Go.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import Files', onPress: () => void importFiles() },
        ]
      );
    } else if (res.error) {
      Alert.alert('Library Scan', res.error);
    } else {
      Alert.alert(
        'Library Updated',
        `Scanned ${res.scanned} audio files (${res.added} added, ${res.removed} removed).`
      );
    }
  };

  const recentPreview = recentlyAdded.slice(0, 6);
  const selection = useSongSelection(recentPreview);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          selection.isSelectionMode && styles.scrollWithSelectionBar,
        ]}
      >
        <ScreenHeader title="Library" />

        {/* Search + Filter Row matching Reference Screen #2 */}
        <View style={styles.searchRow}>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="Search in library..."
            editable={false}
            onPressInput={() => router.push('/search')}
            style={styles.searchFlex}
          />
          <Pressable
            onPress={() => setFilterVisible(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Library options and sorting"
          >
            <SlidersHorizontal size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* 6 Category Rows matching Reference Screen #2 */}
        <View style={styles.categoryList}>
          {categories.map(({ key, title, subtitle, Icon }) => (
            <Pressable
              key={key}
              onPress={() =>
                router.push({
                  pathname: '/library/[category]',
                  params: { category: key },
                })
              }
              style={({ pressed }) => [styles.categoryCard, pressed && styles.cardPressed]}
            >
              <View style={styles.iconBadge}>
                <Icon size={20} color={Colors.accentSecondary} />
              </View>
              <View style={styles.categoryText}>
                <Text style={styles.categoryTitle}>{title}</Text>
                <Text style={styles.categorySubtitle}>{subtitle}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Recently Added List below categories */}
        {recentPreview.length > 0 ? (
          <View style={styles.recentSection}>
            <SectionHeader
              title="Recently Added"
              onActionPress={() =>
                router.push({
                  pathname: '/library/[category]',
                  params: { category: 'recently-added' },
                })
              }
            />
            {recentPreview.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                showAlbum
                isActive={currentSong?.id === song.id}
                selectionMode={selection.isSelectionMode}
                isSelected={selection.selectedIds.has(song.id)}
                onPress={() => {
                  if (selection.isSelectionMode) {
                    selection.toggleSelect(song.id);
                  } else {
                    void playQueue(recentPreview, idx, false);
                  }
                }}
                onLongPress={() => selection.enterSelection(song.id)}
                onMorePress={() => setSelectedSong(song)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SelectionActionBar
        selectedSongs={selection.selectedSongs}
        allSelected={selection.allSelected}
        onToggleSelectAll={() =>
          selection.allSelected ? selection.clearSelection() : selection.selectAll()
        }
        onCancel={selection.clearSelection}
        insideTabScreen
      />

      <BottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Library Options"
        options={[
          {
            label: isScanning ? 'Scanning Device...' : 'Rescan Device Library',
            icon: <RefreshCw size={18} color={Colors.accentSecondary} />,
            onPress: () => void handleRescan(),
          },
          {
            label: 'Import Audio Files',
            icon: <FolderPlus size={18} color={Colors.accentSecondary} />,
            onPress: () => void importFiles(),
          },
          {
            label: 'Sort by Time Added',
            rightText:
              sortBy === 'dateAdded'
                ? sortOrder === 'desc'
                  ? 'Newest'
                  : 'Oldest'
                : 'Newest',
            icon: <Calendar size={18} color={sortBy === 'dateAdded' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'dateAdded',
            onPress: () => handleSort('dateAdded'),
          },
          {
            label: 'Sort by Song Name',
            rightText:
              sortBy === 'title'
                ? sortOrder === 'asc'
                  ? 'A → Z'
                  : 'Z → A'
                : 'A → Z',
            icon: <Music size={18} color={sortBy === 'title' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'title',
            onPress: () => handleSort('title'),
          },
          {
            label: 'Sort by Artist Name',
            rightText:
              sortBy === 'artist'
                ? sortOrder === 'asc'
                  ? 'A → Z'
                  : 'Z → A'
                : 'A → Z',
            icon: <User size={18} color={sortBy === 'artist' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'artist',
            onPress: () => handleSort('artist'),
          },
          {
            label: 'Sort by Duration',
            rightText:
              sortBy === 'duration'
                ? sortOrder === 'desc'
                  ? 'Longest'
                  : 'Shortest'
                : 'Longest',
            icon: <Clock size={18} color={sortBy === 'duration' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'duration',
            onPress: () => handleSort('duration'),
          },
        ]}
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
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  scrollWithSelectionBar: {
    paddingBottom: 150,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  categoryList: {
    paddingHorizontal: Layout.screenPadding,
    gap: 10,
    marginBottom: Spacing.xl,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
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
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recentSection: {
    marginTop: Spacing.xs,
  },
});
