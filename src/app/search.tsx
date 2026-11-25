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
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { SearchTab, Song } from '@/types/music';
import { formatSongCount, localizeMetadata } from '@/utils/format';

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'songs', label: 'آهنگ‌ها' },
  { key: 'artists', label: 'هنرمندان' },
  { key: 'albums', label: 'آلبوم‌ها' },
  { key: 'playlists', label: 'پلی‌لیست‌ها' },
  { key: 'genres', label: 'سبک‌ها' },
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
      <ScreenHeader title="جستجو" onBack={() => router.back()} compact />

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="جستجوی آهنگ، هنرمند، آلبوم..."
          autoFocus
          onSubmitEditing={handleSubmit}
        />
      </View>

      {/* Filter Pills */}
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
                <Text style={styles.historyTitle}>جستجوهای اخیر</Text>
                <Pressable onPress={clearHistory} hitSlop={8}>
                  <Text style={styles.clearAll}>پاک کردن همه</Text>
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
                    accessibilityLabel={`حذف ${item} از تاریخچه جستجو`}
                  >
                    <X size={16} color={Colors.textMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Search size={28} color={Colors.accent} />}
              title="در موسیقی‌هایتان جستجو کنید"
              description="آهنگ‌ها، هنرمندان، آلبوم‌ها، پلی‌لیست‌ها و سبک‌های ذخیره‌شده روی دستگاه را سریع پیدا کنید."
            />
          )
        ) : activeTab === 'songs' ? (
          songResults.length === 0 ? (
            <EmptyState
              icon={<Search size={28} color={Colors.accent} />}
              title="آهنگی پیدا نشد"
              description={`هیچ آهنگی با عبارت «${debouncedQuery}» مطابقت نداشت.`}
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
              title="هنرمندی پیدا نشد"
              description={`هیچ هنرمندی با عبارت «${debouncedQuery}» مطابقت نداشت.`}
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
                      params: {
                        type: 'artist',
                        value: item.name,
                        title: localizeMetadata(item.name, 'هنرمند ناشناس'),
                      },
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
              title="آلبومی پیدا نشد"
              description={`هیچ آلبومی با عبارت «${debouncedQuery}» مطابقت نداشت.`}
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
                      params: {
                        type: 'album',
                        value: item.title,
                        title: localizeMetadata(item.title, 'آلبوم ناشناس'),
                      },
                    });
                  }}
                  style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
                >
                  <AlbumArtwork uri={item.artworkUri} size={48} borderRadius={Radii.sm} />
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityTitle} numberOfLines={1}>
                      {localizeMetadata(item.title, 'آلبوم ناشناس')}
                    </Text>
                    <Text style={styles.entitySub} numberOfLines={1}>
                      {localizeMetadata(item.artist, 'هنرمند ناشناس')} •{' '}
                      {formatSongCount(item.songCount ?? 0)}
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
              title="پلی‌لیستی پیدا نشد"
              description={`هیچ پلی‌لیستی با عبارت «${debouncedQuery}» مطابقت نداشت.`}
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
            title="سبکی پیدا نشد"
            description={`هیچ سبکی با عبارت «${debouncedQuery}» مطابقت نداشت.`}
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
                    params: {
                      type: 'genre',
                      value: item.name,
                      title: localizeMetadata(item.name, 'سبک ناشناس'),
                    },
                  });
                }}
                style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
              >
                <View style={styles.genreBadge}>
                  <Tag size={18} color={Colors.accentSecondary} />
                </View>
                <View style={styles.entityInfo}>
                  <Text style={styles.entityTitle}>
                    {localizeMetadata(item.name, 'سبک ناشناس')}
                  </Text>
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
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    lineHeight: 20,
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
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  clearAll: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.accentSecondary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: Spacing.md,
  },
  historyItemText: {
    flex: 1,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    alignItems: 'flex-start',
  },
  entityTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  entitySub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
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
