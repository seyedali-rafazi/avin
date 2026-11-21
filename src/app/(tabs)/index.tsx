import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  FolderPlus,
  Music,
  RefreshCw,
  Search,
  Shuffle,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  EmptyState,
  PlaylistCard,
  ScreenContainer,
  SectionHeader,
  SelectionActionBar,
  SongOptionsSheet,
  SongRow,
} from '@/components';
import { useSongSelection } from '@/hooks/useSongSelection';
import { useLibraryStore, usePlayerStore, usePlaylistStore } from '@/stores';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import { formatSongCount } from '@/utils/format';

const AVIN_LOGO = require('../../../assets/Avin-logo.png');

export default function HomeScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const recentlyAdded = useLibraryStore((s) => s.recentlyAdded);
  const favoriteSongs = useLibraryStore((s) => s.favoriteSongs);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const scanProgress = useLibraryStore((s) => s.scanProgress);
  const scanDevice = useLibraryStore((s) => s.scanDevice);
  const importFiles = useLibraryStore((s) => s.importFiles);

  const playlists = usePlaylistStore((s) => s.playlists);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const recentPlayedPreview = recentlyPlayed.slice(0, 10);
  const recentAddedPreview = recentlyAdded.slice(0, 8);

  const selection = useSongSelection(recentAddedPreview);

  const handleShuffleAll = () => {
    if (songs.length === 0) {
      void handleScan();
      return;
    }
    void playQueue(songs, 0, true);
  };

  const handleScan = async () => {
    const res = await scanDevice();
    if (res.requiresDevBuild) {
      Alert.alert(
        'Development Build Required',
        res.error ?? 'Use Import Files to load local audio in Expo Go.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import Files', onPress: () => void handleImport() },
        ]
      );
    } else if (res.error) {
      Alert.alert('Library Scan', res.error);
    } else if (res.scanned === 0) {
      Alert.alert(
        'No Audio Files Found',
        'No local music files were found on this device. You can also import audio files directly.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Import Files', onPress: () => void handleImport() },
        ]
      );
    }
  };

  const handleImport = async () => {
    const res = await importFiles();
    if (res.error) {
      Alert.alert('Import Error', res.error);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          selection.isSelectionMode && styles.scrollWithSelectionBar,
        ]}
      >
        {/* Clean Branded App Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoFrame}>
              <Image
                source={AVIN_LOGO}
                style={styles.logoImage}
                contentFit="cover"
              />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandName}>Avin</Text>
              <Text style={styles.brandMeta} numberOfLines={1}>
                {isScanning && scanProgress
                  ? `Scanning ${scanProgress.scanned}${scanProgress.total > 0 ? ` / ${scanProgress.total}` : ''}...`
                  : songs.length > 0
                    ? formatSongCount(songs.length)
                    : 'Local Music'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/search')}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Search music"
            >
              <Search size={19} color={Colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => void handleScan()}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Scan device for music"
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={Colors.accentSecondary} />
              ) : (
                <RefreshCw size={18} color={Colors.textPrimary} />
              )}
            </Pressable>
          </View>
        </View>

        {songs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={<Music size={30} color={Colors.accent} />}
              title="Your Music Library Is Empty"
              description="Scan your device to discover all local audio files or import tracks directly for offline listening."
              actionLabel={isScanning ? 'Scanning...' : 'Scan Device'}
              onAction={() => void handleScan()}
              secondaryActionLabel="Import Files"
              onSecondaryAction={() => void handleImport()}
            />
          </View>
        ) : (
          <>
            {/* Compact Functional Quick-Action Bar */}
            <View style={styles.quickBar}>
              <Pressable
                onPress={handleShuffleAll}
                style={({ pressed }) => [styles.shuffleAllBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Shuffle all songs"
              >
                <Shuffle size={15} color={Colors.textPrimary} />
                <Text style={styles.shuffleAllText}>Shuffle All</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/library/[category]',
                    params: { category: 'all-songs' },
                  })
                }
                style={({ pressed }) => [styles.allSongsBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="View all songs"
              >
                <Music size={15} color={Colors.accentSecondary} />
                <Text style={styles.allSongsText}>All Songs</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleImport()}
                style={({ pressed }) => [styles.importIconBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Import audio files"
              >
                <FolderPlus size={17} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Recently Played Horizontal Row */}
            {recentPlayedPreview.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Recently Played"
                  onActionPress={() =>
                    router.push({
                      pathname: '/library/[category]',
                      params: { category: 'recently-added' },
                    })
                  }
                />
                <FlatList
                  horizontal
                  data={recentPlayedPreview}
                  keyExtractor={(item) => `rp-${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  renderItem={({ item, index }) => (
                    <Pressable
                      onPress={() => void playQueue(recentPlayedPreview, index, false)}
                      style={({ pressed }) => [
                        styles.recentCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <AlbumArtwork
                        uri={item.artworkUri}
                        size={Layout.horizontalCardWidth}
                        borderRadius={Radii.md}
                      />
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.recentArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}

            {/* Your Playlists Horizontal Row */}
            <View style={styles.section}>
              <SectionHeader
                title="Your Playlists"
                onActionPress={() => router.push('/(tabs)/playlists')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                <PlaylistCard
                  title="Favorites"
                  songCount={favoriteSongs.length}
                  isFavorites
                  width={Layout.horizontalCardWidth}
                  artworkHeight={106}
                  onPress={() => router.push('/(tabs)/favorites')}
                />
                {playlists.slice(0, 8).map((pl) => (
                  <PlaylistCard
                    key={pl.id}
                    title={pl.name}
                    songCount={pl.songCount}
                    artworkUri={pl.artworkUri}
                    coverUris={pl.coverUris}
                    width={Layout.horizontalCardWidth}
                    artworkHeight={106}
                    onPress={() =>
                      router.push({
                        pathname: '/playlist/[id]',
                        params: { id: pl.id },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>

            {/* Recently Added Section */}
            <View style={styles.section}>
              <SectionHeader
                title="Recently Added"
                onActionPress={() =>
                  router.push({
                    pathname: '/library/[category]',
                    params: { category: 'recently-added' },
                  })
                }
              />
              {recentAddedPreview.map((song, idx) => (
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
                      void playQueue(recentAddedPreview, idx, false);
                    }
                  }}
                  onLongPress={() => selection.enterSelection(song.id)}
                  onMorePress={() => setSelectedSong(song)}
                />
              ))}
            </View>
          </>
        )}
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
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  logoFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176, 106, 255, 0.35)',
    backgroundColor: '#000',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandName: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  brandMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  shuffleAllBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radii.full,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  shuffleAllText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  allSongsBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  allSongsText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  importIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  horizontalList: {
    paddingHorizontal: Layout.screenPadding,
    gap: Spacing.md,
  },
  recentCard: {
    width: Layout.horizontalCardWidth,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 7,
  },
  recentArtist: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
