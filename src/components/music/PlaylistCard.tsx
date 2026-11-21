import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ListMusic, Plus } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '@/theme';
import { formatSongCount } from '@/utils/format';

interface PlaylistCardProps {
  title: string;
  songCount: number;
  artworkUri?: string | null;
  coverUris?: string[];
  isFavorites?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number | `${number}%`;
  artworkHeight?: number;
  style?: ViewStyle;
}

export const PlaylistCard = React.memo(function PlaylistCard({
  title,
  songCount,
  artworkUri,
  coverUris,
  isFavorites = false,
  onPress,
  onLongPress,
  width,
  artworkHeight = 118,
  style,
}: PlaylistCardProps) {
  const validCovers = (coverUris ?? []).filter(Boolean).slice(0, 4);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        width !== undefined ? { width } : undefined,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.artworkContainer, { height: artworkHeight }]}>
        {isFavorites ? (
          <LinearGradient
            colors={[...Colors.favoritesGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fillCenter}
          >
            <Heart size={36} color={Colors.accent} fill={Colors.accent} />
          </LinearGradient>
        ) : validCovers.length >= 4 ? (
          <View style={styles.collageGrid}>
            {validCovers.map((uri, idx) => (
              <Image
                key={`${uri}-${idx}`}
                source={{ uri }}
                style={styles.collageTile}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </View>
        ) : artworkUri ? (
          <Image
            source={{ uri: artworkUri }}
            style={styles.fullImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <LinearGradient
            colors={[...Colors.artworkPlaceholderGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fillCenter}
          >
            <ListMusic size={34} color={Colors.accentSecondary} strokeWidth={1.7} />
          </LinearGradient>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.count} numberOfLines={1}>
          {formatSongCount(songCount)}
        </Text>
      </View>
    </Pressable>
  );
});

interface CreatePlaylistCardProps {
  onPress: () => void;
  height?: number;
  style?: ViewStyle;
}

export function CreatePlaylistCard({ onPress, height = 178, style }: CreatePlaylistCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.createCard,
        { height },
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Create Playlist"
    >
      <Plus size={26} color={Colors.textSecondary} />
      <Text style={styles.createLabel}>{'Create\nPlaylist'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  artworkContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  collageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collageTile: {
    width: '50%',
    height: '50%',
  },
  meta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  count: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  createCard: {
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderDashed,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  createLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
