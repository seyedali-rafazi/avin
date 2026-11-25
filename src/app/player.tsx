import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  ChevronDown,
  Heart,
  ListMusic,
  MoreVertical,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  BottomSheet,
  IconButton,
  PlaybackControls,
  PlaybackProgressBar,
  ScreenContainer,
  SongOptionsSheet,
  WaveformVisualizer,
} from '@/components';
import { PLAYBACK_SPEEDS } from '@/constants/audio';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing, Typography } from '@/theme';
import {
  formatNumber,
  formatSpeedLabel,
  isUnknownAlbum,
  localizeMetadata,
} from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 48, 336);

export default function NowPlayingScreen() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const volume = usePlayerStore((s) => s.volume);
  const error = usePlayerStore((s) => s.error);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const clearError = usePlayerStore((s) => s.clearError);

  const isFavorite = useLibraryStore((s) =>
    currentSong ? s.favoriteIds.has(currentSong.id) : false
  );
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);
  const [audioSheetVisible, setAudioSheetVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const artworkScale = useSharedValue(isPlaying ? 1 : 0.94);

  useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1 : 0.94, {
      damping: 18,
      stiffness: 150,
    });
  }, [isPlaying, artworkScale]);

  const animatedArtworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  if (!currentSong) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon={<ChevronDown size={26} color={Colors.textPrimary} />}
            onPress={() => router.back()}
            accessibilityLabel="بستن پخش‌کننده"
          />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={Typography.sectionTitle}>آهنگی در حال پخش نیست</Text>
          <Text style={styles.emptySub}>
            برای شروع گوش دادن، یک آهنگ از کتابخانه انتخاب کنید.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const artistName = localizeMetadata(currentSong.artist, 'هنرمند ناشناس');
  const albumName = localizeMetadata(currentSong.album, 'آلبوم ناشناس');
  const subtitle = !isUnknownAlbum(currentSong.album)
    ? `${artistName} • ${albumName}`
    : artistName;

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Top Navigation Row */}
        <View style={styles.topBar}>
          <IconButton
            icon={<ChevronDown size={26} color={Colors.textPrimary} />}
            onPress={() => router.back()}
            accessibilityLabel="بازگشت"
          />
          <Text style={styles.nowPlayingBadge}>در حال پخش</Text>
          <IconButton
            icon={<MoreVertical size={22} color={Colors.textPrimary} />}
            onPress={() => setOptionsVisible(true)}
            accessibilityLabel="گزینه‌های بیشتر آهنگ"
          />
        </View>

        {error ? (
          <Pressable onPress={clearError} style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        {/* Large Centered Album Artwork */}
        <View style={styles.artworkStage}>
          <Animated.View style={[styles.artworkShadow, animatedArtworkStyle]}>
            <AlbumArtwork
              uri={currentSong.artworkUri}
              size={ARTWORK_SIZE}
              borderRadius={Radii.xxl}
              iconSize={76}
            />
          </Animated.View>
        </View>

        {/* Bottom Controls Stack */}
        <View style={styles.controlsSection}>
          {/* Track Title + Artist + Purple Heart */}
          <View style={styles.trackHeader}>
            <View style={styles.trackMeta}>
              <Text style={Typography.playerTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.artistText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <IconButton
              icon={
                <Heart
                  size={24}
                  color={isFavorite ? Colors.accent : Colors.textSecondary}
                  fill={isFavorite ? Colors.accent : 'transparent'}
                />
              }
              onPress={() => toggleFavorite(currentSong.id)}
              accessibilityLabel={
                isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'
              }
            />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <PlaybackProgressBar
              position={position}
              duration={duration > 0 ? duration : currentSong.duration}
              onSeek={(sec) => void seekTo(sec)}
            />
          </View>

          {/* Main Playback Controls */}
          <View style={styles.mainControlsWrap}>
            <PlaybackControls
              isPlaying={isPlaying}
              isBuffering={isBuffering}
              shuffle={shuffle}
              repeatMode={repeatMode}
              onPlayPause={togglePlayPause}
              onNext={() => void nextTrack(false)}
              onPrevious={() => void previousTrack()}
              onToggleShuffle={toggleShuffle}
              onCycleRepeat={cycleRepeat}
            />
          </View>

          {/* Secondary Controls Row: Speed pill + Queue + Audio Sliders */}
          <View style={styles.secondaryRow}>
            <Pressable
              onPress={() => setSpeedSheetVisible(true)}
              style={({ pressed }) => [styles.speedPill, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`سرعت پخش ${formatSpeedLabel(playbackRate)}`}
            >
              <Text style={styles.speedText}>{formatSpeedLabel(playbackRate)}</Text>
              <ChevronDown size={14} color={Colors.textSecondary} />
            </Pressable>

            <View style={styles.secondaryEnd}>
              <IconButton
                icon={<ListMusic size={21} color={Colors.textPrimary} />}
                onPress={() => router.push('/queue')}
                accessibilityLabel="باز کردن صف پخش"
              />
              <IconButton
                icon={<SlidersHorizontal size={20} color={Colors.textPrimary} />}
                onPress={() => setAudioSheetVisible(true)}
                accessibilityLabel="تنظیمات صدا"
              />
            </View>
          </View>

          {/* Subtle Purple Bottom Waveform Visualizer */}
          <View style={styles.visualizerWrap}>
            <WaveformVisualizer isPlaying={isPlaying} />
          </View>
        </View>
      </View>

      {/* Playback Speed Picker */}
      <BottomSheet
        visible={speedSheetVisible}
        onClose={() => setSpeedSheetVisible(false)}
        title="سرعت پخش"
        options={PLAYBACK_SPEEDS.map((rate) => ({
          label: `${formatSpeedLabel(rate)}${rate === 1.0 ? ' (عادی)' : ''}`,
          selected: playbackRate === rate,
          onPress: () => setPlaybackRate(rate),
        }))}
      />

      {/* Volume / Audio Options Sheet */}
      <BottomSheet
        visible={audioSheetVisible}
        onClose={() => setAudioSheetVisible(false)}
        title="خروجی صدا"
        subtitle={`بلندی صدا: ${formatNumber(Math.round(volume * 100))}٪`}
        options={[
          {
            label: 'بلندی صدا ۱۰۰٪',
            icon: <Volume2 size={18} color={Colors.accentSecondary} />,
            selected: volume >= 0.95,
            onPress: () => setVolume(1.0),
          },
          {
            label: 'بلندی صدا ۷۵٪',
            icon: <Volume2 size={18} color={Colors.textPrimary} />,
            selected: volume >= 0.65 && volume < 0.95,
            onPress: () => setVolume(0.75),
          },
          {
            label: 'بلندی صدا ۵۰٪',
            icon: <Volume2 size={18} color={Colors.textPrimary} />,
            selected: volume >= 0.4 && volume < 0.65,
            onPress: () => setVolume(0.5),
          },
          {
            label: 'بلندی صدا ۲۵٪',
            icon: <Volume2 size={18} color={Colors.textPrimary} />,
            selected: volume > 0 && volume < 0.4,
            onPress: () => setVolume(0.25),
          },
          {
            label: 'بی‌صدا',
            icon: <VolumeX size={18} color={Colors.textSecondary} />,
            selected: volume === 0,
            onPress: () => setVolume(0),
          },
        ]}
      />

      <SongOptionsSheet
        song={currentSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding + 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  nowPlayingBadge: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: Colors.dangerMuted,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorText: {
    fontFamily: Fonts.regular,
    color: Colors.danger,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  artworkStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  artworkShadow: {
    borderRadius: Radii.xxl,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  controlsSection: {
    paddingBottom: Spacing.sm,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  trackMeta: {
    flex: 1,
    alignItems: 'flex-start',
  },
  artistText: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  progressWrap: {
    marginBottom: Spacing.lg,
  },
  mainControlsWrap: {
    marginBottom: Spacing.xl,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
  },
  speedText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 19,
  },
  secondaryEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  visualizerWrap: {
    marginTop: Spacing.xs,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xxl,
  },
  emptySub: {
    ...Typography.subtitle,
    textAlign: 'center',
  },
});
