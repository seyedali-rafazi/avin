import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Clock, Disc, ListMusic, Search, Tag, X } from 'lucide-react-native';
import {
  AlbumArtwork,
  ArtistCard,
  EmptyState,
  MiniPlayer,
  ScreenContainer,
  ScreenHeader,
  SearchBar,
  SongOptionsSheet,
  SongRow,
} from '@/components';
import { playlistRepository, songRepository } from '@/database/repositories';
import { useDebounce } from '@/hooks/useDebounce';
import { useLibraryStore, usePlayerStore, useSearchStore } from '@/stores';
import { Colors, Layout, Radii, Spacing } from '@/theme';
import type { SearchTab, Song } from '@/types/music';
import { formatSongCount } from '@/utils/format';

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'albums', label: 'Albums' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'genres', label: 'Genres' },
];

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const activeTab = useSearchStore((s) => s.activeTab);
  const history = useSearchStore((s) => s.history);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setActiveTab = useSearchStore((s) => s.setActiveTab);
  const saveToHistory = useSearchStore((s) => s.saveToHistory);
  const removeHistoryItem = useSearchStore((s) => s.removeHistoryItem);
  const clearHistory = useSearchStore((s) => s.clearHistory);

  const artists = useLibraryStore((s) => s.artists);
  const albums = useLibraryStore((s) => s.albums);
  const genres = useLibraryStore((s) => s.genres);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const debouncedQuery = useDebounce(query, 180);

  useEffect(() => {
    useSearchStore.getState().loadHistory();
  }, []);

  const lower = debouncedQuery.trim().toLowerCase();

  const songResults = useMemo(
    () => (lower ? songRepository.search(lower) : []),
    [lower]
  );

  const artistResults = useMemo(
    () => (lower ? artists.filter((a) => a.name.toLowerCase().includes(lower)) : []),
    [artists, lower]
  );

  const albumResults = useMemo(
    () =>
      lower
        ? albums.filter(
            (a) =>
              a.title.toLowerCase().includes(lower) ||
              a.artist.toLowerCase().includes(lower)
          )
        : [],
    [albums, lower]
  );

  const playlistResults = useMemo(
    () => (lower ? playlistRepository.search(lower) : []),
    [lower]
  );

  const genreResults = useMemo(
    () => (lower ? genres.filter((g) => g.name.toLowerCase().includes(lower)) : []),
    [genres, lower]
  );

  const handleSubmit = () => {
    if (query.trim()) {
      saveToHistory(query.trim());
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader title="Search" onBack={() => router.back()} compact />

      {/* Search Bar matching Reference Screen #5 */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, albums..."
          autoFocus
          onSubmitEditing={handleSubmit}
        />
      </View>

      {/* Filter Pills matching Reference Screen #5 */}
      <View style={styles.pillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Results or Search History */}
      <View style={styles.body}>
        {!lower ? (
          history.length > 0 ? (
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Searches</Text>
                <Pressable onPress={clearHistory} hitSlop={8}>
                  <Text style={styles.clearAll}>Clear all</Text>
                </Pressable>
              </View>
              {history.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setQuery(item)}
                  style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
                >
                  <Clock size={16} color={Colors.textMuted} />
                  <Text style={styles.historyItemText} numberOfLines={1}>
                    {item}
                  </Text>
                  <Pressable
                    onPress={() => removeHistoryItem(item)}
                    hitSlop={10}
                    accessibilityLabel={`Remove ${item} from search history`}
                  >
                    <X size={16} color={Colors.textMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Search size={28} color={Colors.accent} />}
              title="Search Your Music"
              description="Find songs, artists, albums, playlists, and genres stored on your device."
            />
          )
        ) : activeTab === 'songs' ? (
          songResults.length === 0 ? (
            <EmptyState
              icon={<Search size={28} color={Colors.accent} />}
              title="No Songs Found"
              description={`No tracks matched "${debouncedQuery}".`}
            />
          ) : (
            <FlatList
              data={songResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <SongRow
                  song={item}
                  isActive={currentSong?.id === item.id}
                  highlightQuery={debouncedQuery}
                  onPress={() => {
                    saveToHistory(debouncedQuery);
                    void playQueue(songResults, index, false);
                  }}
                  onMorePress={() => setSelectedSong(item)}
                />
              )}
              contentContainerStyle={styles.listPadding}
            />
          )
        ) : activeTab === 'artists' ? (
          artistResults.length === 0 ? (
            <EmptyState
              icon={<Search size={28} color={Colors.accent} />}
              title="No Artists Found"
              description={`No artists matched "${debouncedQuery}".`}
            />
          ) : (
            <FlatList
              data={artistResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ArtistCard
                  artist={item}
                  onPress={() => {
                    saveToHistory(debouncedQuery);
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'artist', value: item.name, title: item.name },
                    });
                  }}
                />
              )}
            />
          )
        ) : activeTab === 'albums' ? (
          albumResults.length === 0 ? (
            <EmptyState
              icon={<Disc size={28} color={Colors.accent} />}
              title="No Albums Found"
              description={`No albums matched "${debouncedQuery}".`}
            />
          ) : (
            <FlatList
              data={albumResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    saveToHistory(debouncedQuery);
                    router.push({
                      pathname: '/library/detail',
                      params: { type: 'album', value: item.title, title: item.title },
                    });
                  }}
                  style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
                >
                  <AlbumArtwork uri={item.artworkUri} size={48} borderRadius={Radii.sm} />
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.entitySub} numberOfLines={1}>
                      {item.artist} • {formatSongCount(item.songCount ?? 0)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )
        ) : activeTab === 'playlists' ? (
          playlistResults.length === 0 ? (
            <EmptyState
              icon={<ListMusic size={28} color={Colors.accent} />}
              title="No Playlists Found"
              description={`No playlists matched "${debouncedQuery}".`}
            />
          ) : (
            <FlatList
              data={playlistResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    saveToHistory(debouncedQuery);
                    router.push({ pathname: '/playlist/[id]', params: { id: item.id } });
                  }}
                  style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
                >
                  <AlbumArtwork uri={item.artworkUri} size={48} borderRadius={Radii.sm} />
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.entitySub}>
                      {formatSongCount(item.songCount)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )
        ) : genreResults.length === 0 ? (
          <EmptyState
            icon={<Tag size={28} color={Colors.accent} />}
            title="No Genres Found"
            description={`No genres matched "${debouncedQuery}".`}
          />
        ) : (
          <FlatList
            data={genreResults}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  saveToHistory(debouncedQuery);
                  router.push({
                    pathname: '/library/detail',
                    params: { type: 'genre', value: item.name, title: item.name },
                  });
                }}
                style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
              >
                <View style={styles.genreBadge}>
                  <Tag size={18} color={Colors.accentSecondary} />
                </View>
                <View style={styles.entityInfo}>
                  <Text style={styles.entityTitle}>{item.name}</Text>
                  <Text style={styles.entitySub}>{formatSongCount(item.songCount)}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      <MiniPlayer />

      <SongOptionsSheet
        song={selectedSong}
        visible={Boolean(selectedSong)}
        onClose={() => setSelectedSong(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.md,
  },
  pillsContainer: {
    marginBottom: Spacing.md,
  },
  pillsRow: {
    paddingHorizontal: Layout.screenPadding,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textPrimary,
  },
  body: {
    flex: 1,
  },
  listPadding: {
    paddingBottom: Spacing.xl,
  },
  historyContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  clearAll: {
    fontSize: 13,
    color: Colors.accentSecondary,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: Spacing.md,
  },
  historyItemText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 10,
    gap: Spacing.md,
  },
  entityInfo: {
    flex: 1,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  entitySub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  genreBadge: {
    width: 46,
    height: 46,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceIconBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Colors.surface,
  },
});
