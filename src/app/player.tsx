import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  Moon,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  AudioEffectsSheet,
  BottomSheet,
  IconButton,
  LyricsView,
  PlaybackControls,
  PlaybackProgressBar,
  ScreenContainer,
  SleepTimerSheet,
  SongOptionsSheet,
  WaveformVisualizer,
} from '@/components';
import { PLAYBACK_SPEEDS } from '@/constants/audio';
import { useLibraryStore, usePlayerStore, useSleepTimerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing, Typography } from '@/theme';
import {
  formatDuration,
  formatSpeedLabel,
  isUnknownAlbum,
  localizeMetadata,
} from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 48, 326);
const SWIPE_X_THRESHOLD = 65;
const SWIPE_DOWN_THRESHOLD = 90;

export default function NowPlayingScreen() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const error = usePlayerStore((s) => s.error);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);
  const clearError = usePlayerStore((s) => s.clearError);

  const isFavorite = useLibraryStore((s) =>
    currentSong ? s.favoriteIds.has(currentSong.id) : false
  );
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const sleepMode = useSleepTimerStore((s) => s.mode);
  const sleepRemaining = useSleepTimerStore((s) => s.remainingSeconds);

  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);
  const [audioSheetVisible, setAudioSheetVisible] = useState(false);
  const [sleepSheetVisible, setSleepSheetVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const artworkScale = useSharedValue(isPlaying ? 1 : 0.94);
  const artworkTranslateX = useSharedValue(0);
  const screenTranslateY = useSharedValue(0);

  useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1 : 0.94, {
      damping: 18,
      stiffness: 150,
    });
  }, [isPlaying, artworkScale]);

  const triggerNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void nextTrack(false);
  };

  const triggerPrev = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void previousTrack();
  };

  const dismissPlayer = () => {
    router.back();
  };

  // Horizontal swipe on artwork -> next/prev track; downward swipe -> close player
  const artworkPanGesture = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .activeOffsetY([22, 1000])
    .onUpdate((e) => {
      if (Math.abs(e.translationX) >= Math.abs(e.translationY)) {
        artworkTranslateX.value = Math.max(-110, Math.min(110, e.translationX));
      } else if (e.translationY > 0) {
        screenTranslateY.value = Math.min(180, e.translationY);
      }
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) >= Math.abs(e.translationY)) {
        if (e.translationX <= -SWIPE_X_THRESHOLD) {
          runOnJS(triggerNext)();
        } else if (e.translationX >= SWIPE_X_THRESHOLD) {
          runOnJS(triggerPrev)();
        }
      } else if (e.translationY >= SWIPE_DOWN_THRESHOLD) {
        runOnJS(dismissPlayer)();
      }
      artworkTranslateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      screenTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    })
    .onFinalize(() => {
      artworkTranslateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      screenTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  // Downward swipe on top header bar to dismiss even when lyrics are open
  const headerDismissGesture = Gesture.Pan()
    .activeOffsetY([16, 1000])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        screenTranslateY.value = Math.min(180, e.translationY);
      }
    })
    .onEnd((e) => {
      if (e.translationY >= SWIPE_DOWN_THRESHOLD) {
        runOnJS(dismissPlayer)();
      }
      screenTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    })
    .onFinalize(() => {
      screenTranslateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const animatedArtworkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: artworkTranslateX.value },
      { scale: artworkScale.value },
    ],
  }));

  const animatedScreenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: screenTranslateY.value }],
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
      <Animated.View style={[styles.container, animatedScreenStyle]}>
        {/* Top Navigation Row (swipe down to dismiss) */}
        <GestureDetector gesture={headerDismissGesture}>
          <View style={styles.topBar}>
            <IconButton
              icon={<ChevronDown size={26} color={Colors.textPrimary} />}
              onPress={() => router.back()}
              accessibilityLabel="بازگشت"
            />
            <View style={styles.topCenter}>
              <Text style={styles.nowPlayingBadge}>
                {showLyrics ? 'متن آهنگ' : 'در حال پخش'}
              </Text>
              {sleepMode !== 'off' ? (
                <Pressable
                  onPress={() => setSleepSheetVisible(true)}
                  style={styles.sleepBadge}
                >
                  <Moon size={11} color={Colors.accentSecondary} />
                  <Text style={styles.sleepBadgeText}>
                    {sleepMode === 'duration'
                      ? formatDuration(sleepRemaining)
                      : 'پایان آهنگ'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <IconButton
              icon={<MoreVertical size={22} color={Colors.textPrimary} />}
              onPress={() => setOptionsVisible(true)}
              accessibilityLabel="گزینه‌های بیشتر آهنگ"
            />
          </View>
        </GestureDetector>

        {error ? (
          <Pressable onPress={clearError} style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        {/* Artwork Stage OR Synced Lyrics View */}
        <View style={styles.artworkStage}>
          {showLyrics ? (
            <LyricsView
              song={currentSong}
              position={position}
              onSeek={(sec) => void seekTo(sec)}
            />
          ) : (
            <GestureDetector gesture={artworkPanGesture}>
              <Animated.View style={[styles.artworkShadow, animatedArtworkStyle]}>
                <AlbumArtwork
                  uri={currentSong.artworkUri}
                  size={ARTWORK_SIZE}
                  borderRadius={Radii.xxl}
                  iconSize={76}
                />
              </Animated.View>
            </GestureDetector>
          )}
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

          {/* Secondary Controls Row: Speed + Lyrics + Sleep Timer + Queue + EQ */}
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
                icon={
                  <FileText
                    size={20}
                    color={showLyrics ? Colors.accentSecondary : Colors.textPrimary}
                  />
                }
                onPress={() => setShowLyrics((v) => !v)}
                accessibilityLabel="نمایش متن آهنگ"
              />
              <IconButton
                icon={
                  <Moon
                    size={20}
                    color={sleepMode !== 'off' ? Colors.accentSecondary : Colors.textPrimary}
                  />
                }
                onPress={() => setSleepSheetVisible(true)}
                accessibilityLabel="تایمر خواب"
              />
              <IconButton
                icon={<ListMusic size={21} color={Colors.textPrimary} />}
                onPress={() => router.push('/queue')}
                accessibilityLabel="باز کردن صف پخش"
              />
              <IconButton
                icon={<SlidersHorizontal size={20} color={Colors.textPrimary} />}
                onPress={() => setAudioSheetVisible(true)}
                accessibilityLabel="تنظیمات صدا و اکولایزر"
              />
            </View>
          </View>

          {/* Subtle Purple Bottom Waveform Visualizer */}
          <View style={styles.visualizerWrap}>
            <WaveformVisualizer isPlaying={isPlaying} />
          </View>
        </View>
      </Animated.View>

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

      {/* Continuous Volume & 5-Band Equalizer Sheet */}
      <AudioEffectsSheet
        visible={audioSheetVisible}
        onClose={() => setAudioSheetVisible(false)}
      />

      {/* Sleep Timer Sheet */}
      <SleepTimerSheet
        visible={sleepSheetVisible}
        onClose={() => setSleepSheetVisible(false)}
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
  topCenter: {
    alignItems: 'center',
    gap: 2,
  },
  nowPlayingBadge: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  sleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  sleepBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10.5,
    color: Colors.accentSecondary,
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
    gap: 4,
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
