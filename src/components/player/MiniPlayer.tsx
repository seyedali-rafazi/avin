import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusic, Pause, Play } from 'lucide-react-native';
import { AlbumArtwork } from '@/components/music/AlbumArtwork';
import { useIsSelectionBarActive } from '@/components/music/SelectionActionBar';
import { usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import { localizeMetadata } from '@/utils/format';

const SWIPE_THRESHOLD = 48;

const MiniPlayerProgressBar = React.memo(function MiniPlayerProgressBar() {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const progress =
    duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
});

interface MiniPlayerProps {
  /** Float above screen content so mounting never resizes lists or resets scroll position. */
  floating?: boolean;
  /** Explicit bottom offset when floating above a tab bar; defaults to safe-area bottom inset. */
  bottomOffset?: number;
}

export const MiniPlayer = React.memo(function MiniPlayer({
  floating = true,
  bottomOffset,
}: MiniPlayerProps) {
  const insets = useSafeAreaInsets();
  const selectionActive = useIsSelectionBarActive();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);

  const translateX = useSharedValue(0);

  const triggerNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void nextTrack(false);
  }, [nextTrack]);

  const triggerPrev = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void previousTrack();
  }, [previousTrack]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          translateX.value = Math.max(-72, Math.min(72, e.translationX));
        })
        .onEnd((e) => {
          if (e.translationX <= -SWIPE_THRESHOLD) {
            runOnJS(triggerNext)();
          } else if (e.translationX >= SWIPE_THRESHOLD) {
            runOnJS(triggerPrev)();
          }
          translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
        })
        .onFinalize(() => {
          translateX.value = withSpring(0, { damping: 20, stiffness: 240 });
        }),
    [translateX, triggerNext, triggerPrev]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!currentSong || selectionActive) {
    return null;
  }

  const artistName = localizeMetadata(currentSong.artist, 'هنرمند ناشناس');
  const resolvedBottom =
    bottomOffset !== undefined ? bottomOffset : Math.max(insets.bottom, Spacing.xs);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        floating && [styles.floatingWrapper, { bottom: resolvedBottom }],
      ]}
    >
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={() => router.push('/player')}
            style={({ pressed }) => [styles.container, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`در حال پخش: ${currentSong.title} از ${artistName}. باز کردن پخش‌کننده.`}
          >
            <View style={styles.contentRow}>
              <AlbumArtwork
                uri={currentSong.artworkUri}
                size={Layout.miniPlayerArtwork}
                borderRadius={Radii.sm}
              />

              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {artistName}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.actionPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'توقف' : 'پخش'}
                >
                  {isPlaying ? (
                    <Pause size={21} color={Colors.textPrimary} fill={Colors.textPrimary} />
                  ) : (
                    <Play size={21} color={Colors.textPrimary} fill={Colors.textPrimary} />
                  )}
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/queue');
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.actionPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="باز کردن صف پخش"
                >
                  <ListMusic size={21} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <MiniPlayerProgressBar />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.sm,
    paddingBottom: 4,
    paddingTop: 4,
    direction: 'rtl',
  },
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
  },
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 10,
  },
  pressed: {
    opacity: 0.92,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: Spacing.md,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 21,
    color: Colors.textPrimary,
    marginBottom: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  artist: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.6,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: Colors.trackBackground,
    width: '100%',
    direction: 'ltr',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
});
