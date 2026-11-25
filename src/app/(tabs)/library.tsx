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
  BarChart3,
  Calendar,
  ChevronLeft,
  Clock,
  Disc,
  Flame,
  Folder,
  FolderPlus,
  History,
  Music,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
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
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import type { LibraryCategory, Song, SortField } from '@/types/music';
import { formatCount, formatNumber, formatSongCount, localizeMetadata } from '@/utils/format';

export default function LibraryScreen() {
  const songs = useLibraryStore((s) => s.songs);
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);
  const genres = useLibraryStore((s) => s.genres);
  const folders = useLibraryStore((s) => s.folders);
  const recentlyAdded = useLibraryStore((s) => s.recentlyAdded);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);
  const mostPlayed = useLibraryStore((s) => s.mostPlayed);
  const neverPlayed = useLibraryStore((s) => s.neverPlayed);
  const listeningStats = useLibraryStore((s) => s.listeningStats);
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
      title: 'همه آهنگ‌ها',
      subtitle: formatSongCount(songs.length),
      Icon: Music,
    },
    {
      key: 'albums',
      title: 'آلبوم‌ها',
      subtitle: formatCount(albums.length, 'آلبوم'),
      Icon: Disc,
    },
    {
      key: 'artists',
      title: 'هنرمندان',
      subtitle: formatCount(artists.length, 'هنرمند'),
      Icon: Users,
    },
    {
      key: 'genres',
      title: 'سبک‌ها',
      subtitle: formatCount(genres.length, 'سبک'),
      Icon: Tag,
    },
    {
      key: 'folders',
      title: 'پوشه‌ها',
      subtitle: formatCount(folders.length, 'پوشه'),
      Icon: Folder,
    },
    {
      key: 'recently-added',
      title: 'تازه اضافه‌شده',
      subtitle: formatSongCount(recentlyAdded.length),
      Icon: Clock,
    },
    {
      key: 'recently-played',
      title: 'اخیراً پخش‌شده',
      subtitle: formatSongCount(recentlyPlayed.length),
      Icon: History,
    },
    {
      key: 'most-played',
      title: 'پرتکرارترین‌ها',
      subtitle: formatSongCount(mostPlayed.length),
      Icon: Flame,
    },
    {
      key: 'never-played',
      title: 'گوش‌نداده‌ها',
      subtitle: formatSongCount(neverPlayed.length),
      Icon: Sparkles,
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
        'نیازمند نسخه نصبی',
        res.error ?? 'برای وارد کردن فایل‌های صوتی از گزینه افزودن فایل استفاده کنید.',
        [
          { text: 'انصراف', style: 'cancel' },
          { text: 'افزودن فایل', onPress: () => void importFiles() },
        ]
      );
    } else if (res.error) {
      Alert.alert('اسکن کتابخانه', res.error);
    } else {
      Alert.alert(
        'کتابخانه به‌روزرسانی شد',
        `${formatNumber(res.scanned)} فایل صوتی بررسی شد (${formatNumber(res.added)} مورد جدید، ${formatNumber(res.removed)} مورد حذف‌شده).`
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
        <ScreenHeader title="کتابخانه" />

        {/* Search + Filter Row */}
        <View style={styles.searchRow}>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="جستجو در کتابخانه..."
            editable={false}
            onPressInput={() => router.push('/search')}
            style={styles.searchFlex}
          />
          <Pressable
            onPress={() => setFilterVisible(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="گزینه‌های کتابخانه و مرتب‌سازی"
          >
            <SlidersHorizontal size={19} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Listening Stats Card */}
        {listeningStats.totalPlays > 0 ? (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <BarChart3 size={17} color={Colors.accentSecondary} />
              <Text style={styles.statsTitle}>آمار گوش دادن شما</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {formatNumber(listeningStats.totalPlays)}
                </Text>
                <Text style={styles.statLabel}>کل پخش‌ها</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {formatNumber(Math.max(1, Math.round(listeningStats.totalDurationSeconds / 60)))}
                </Text>
                <Text style={styles.statLabel}>دقیقه شنیده</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {listeningStats.topArtist
                    ? localizeMetadata(listeningStats.topArtist, 'ناشناس')
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>هنرمند برتر</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Category & Smart Playlist Rows */}
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
              <ChevronLeft size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Recently Added List below categories */}
        {recentPreview.length > 0 ? (
          <View style={styles.recentSection}>
            <SectionHeader
              title="تازه اضافه‌شده"
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
        title="گزینه‌های کتابخانه"
        options={[
          {
            label: isScanning ? 'در حال اسکن دستگاه...' : 'اسکن مجدد کتابخانه',
            icon: <RefreshCw size={18} color={Colors.accentSecondary} />,
            onPress: () => void handleRescan(),
          },
          {
            label: 'افزودن فایل‌های صوتی',
            icon: <FolderPlus size={18} color={Colors.accentSecondary} />,
            onPress: () => void importFiles(),
          },
          {
            label: 'مرتب‌سازی بر اساس زمان افزودن',
            rightText:
              sortBy === 'dateAdded'
                ? sortOrder === 'desc'
                  ? 'جدیدترین'
                  : 'قدیمی‌ترین'
                : 'جدیدترین',
            icon: <Calendar size={18} color={sortBy === 'dateAdded' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'dateAdded',
            onPress: () => handleSort('dateAdded'),
          },
          {
            label: 'مرتب‌سازی بر اساس نام آهنگ',
            rightText:
              sortBy === 'title'
                ? sortOrder === 'asc'
                  ? 'الف تا ی'
                  : 'ی تا الف'
                : 'الف تا ی',
            icon: <Music size={18} color={sortBy === 'title' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'title',
            onPress: () => handleSort('title'),
          },
          {
            label: 'مرتب‌سازی بر اساس نام هنرمند',
            rightText:
              sortBy === 'artist'
                ? sortOrder === 'asc'
                  ? 'الف تا ی'
                  : 'ی تا الف'
                : 'الف تا ی',
            icon: <User size={18} color={sortBy === 'artist' ? Colors.accentSecondary : Colors.textSecondary} />,
            selected: sortBy === 'artist',
            onPress: () => handleSort('artist'),
          },
          {
            label: 'مرتب‌سازی بر اساس مدت زمان',
            rightText:
              sortBy === 'duration'
                ? sortOrder === 'desc'
                  ? 'بلندترین'
                  : 'کوتاه‌ترین'
                : 'بلندترین',
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
    width: 46,
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
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
    alignItems: 'flex-start',
  },
  categoryTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  categorySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  recentSection: {
    marginTop: Spacing.xs,
  },
  statsCard: {
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statsTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.accentSecondary,
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
