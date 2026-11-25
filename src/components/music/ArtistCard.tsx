import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Fonts, Layout, Spacing } from '@/theme';
import type { Artist } from '@/types/music';
import { formatSongCount, localizeMetadata } from '@/utils/format';
import { AlbumArtwork } from './AlbumArtwork';

interface ArtistCardProps {
  artist: Artist;
  onPress: () => void;
}

export const ArtistCard = React.memo(function ArtistCard({ artist, onPress }: ArtistCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AlbumArtwork uri={artist.artworkUri} size={48} borderRadius={24} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {localizeMetadata(artist.name, 'هنرمند ناشناس')}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatSongCount(artist.songCount ?? 0)}
        </Text>
      </View>
      <ChevronLeft size={18} color={Colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 10,
    gap: Spacing.md,
  },
  pressed: {
    backgroundColor: Colors.surface,
  },
  info: {
    flex: 1,
    alignItems: 'flex-start',
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
