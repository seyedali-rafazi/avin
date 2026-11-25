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
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';
import {
  formatNumber,
  formatSongCount,
  getTimeGreeting,
  localizeMetadata,
} from '@/utils/format';

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
        'نیازمند نسخه نصبی',
        res.error ?? 'برای وارد کردن فایل‌های صوتی از گزینه افزودن فایل استفاده کنید.',
        [
          { text: 'انصراف', style: 'cancel' },
          { text: 'افزودن فایل', onPress: () => void handleImport() },
        ]
      );
    } else if (res.error) {
      Alert.alert('اسکن کتابخانه', res.error);
    } else if (res.scanned === 0) {
      Alert.alert(
        'فایل صوتی یافت نشد',
        'هیچ فایل موسیقی در حافظه دستگاه پیدا نشد. می‌توانید فایل‌های صوتی را به صورت دستی اضافه کنید.',
        [
          { text: 'باشه', style: 'cancel' },
          { text: 'افزودن فایل', onPress: () => void handleImport() },
        ]
      );
    }
  };

  const handleImport = async () => {
    const res = await importFiles();
    if (res.error) {
      Alert.alert('خطا در افزودن فایل', res.error);
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
              <Text style={styles.brandName}>آوین</Text>
              <Text style={styles.brandMeta} numberOfLines={1}>
                {isScanning && scanProgress
                  ? `در حال اسکن ${formatNumber(scanProgress.scanned)}${scanProgress.total > 0 ? ` از ${formatNumber(scanProgress.total)}` : ''}...`
                  : songs.length > 0
                    ? `${getTimeGreeting()} • ${formatSongCount(songs.length)}`
                    : 'پخش‌کننده موسیقی آفلاین'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/search')}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="جستجوی موسیقی"
            >
              <Search size={19} color={Colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => void handleScan()}
              hitSlop={8}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="اسکن دستگاه برای یافتن موسیقی"
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
              title="کتابخانه موسیقی شما خالی است"
              description="حافظه دستگاه را اسکن کنید تا تمام فایل‌های صوتی پیدا شوند، یا آهنگ‌ها را به صورت دستی اضافه کنید."
              actionLabel={isScanning ? 'در حال اسکن...' : 'اسکن دستگاه'}
              onAction={() => void handleScan()}
              secondaryActionLabel="افزودن فایل"
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
                accessibilityLabel="پخش تصادفی همه آهنگ‌ها"
              >
                <Shuffle size={15} color={Colors.textPrimary} />
                <Text style={styles.shuffleAllText}>پخش تصادفی</Text>
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
                accessibilityLabel="مشاهده همه آهنگ‌ها"
              >
                <Music size={15} color={Colors.accentSecondary} />
                <Text style={styles.allSongsText}>همه آهنگ‌ها</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleImport()}
                style={({ pressed }) => [styles.importIconBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="افزودن فایل صوتی"
              >
                <FolderPlus size={17} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Recently Played Horizontal Row */}
            {recentPlayedPreview.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="اخیراً پخش‌شده"
                  onActionPress={() =>
                    router.push({
                      pathname: '/library/[category]',
                      params: { category: 'recently-played' },
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
                        {localizeMetadata(item.artist, 'هنرمند ناشناس')}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : null}

            {/* Your Playlists Horizontal Row */}
            <View style={styles.section}>
              <SectionHeader
                title="پلی‌لیست‌های شما"
                onActionPress={() => router.push('/(tabs)/playlists')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                <PlaylistCard
                  title="علاقه‌مندی‌ها"
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
                title="تازه اضافه‌شده"
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
    width: 40,
    height: 40,
    borderRadius: 11,
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
    alignItems: 'flex-start',
  },
  brandName: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  brandMeta: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  shuffleAllText: {
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  allSongsBtn: {
    flex: 1,
    height: 44,
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
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  importIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    alignItems: 'flex-start',
  },
  recentTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textPrimary,
    marginTop: 7,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  recentArtist: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
});
