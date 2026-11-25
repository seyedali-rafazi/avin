import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ListMusic, Pause, Play } from 'lucide-react-native';
import { AlbumArtwork } from '@/components/music/AlbumArtwork';
import { usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing } from '@/theme';
import { localizeMetadata } from '@/utils/format';

export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  if (!currentSong) {
    return null;
  }

  const progress =
    duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;
  const artistName = localizeMetadata(currentSong.artist, 'هنرمند ناشناس');

  return (
    <View style={styles.wrapper}>
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
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
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
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel="باز کردن صف پخش"
            >
              <ListMusic size={21} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingBottom: 4,
    paddingTop: 4,
    direction: 'rtl',
  },
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
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
