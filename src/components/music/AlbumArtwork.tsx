import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Music } from 'lucide-react-native';
import { Colors, Radii } from '@/theme';

interface AlbumArtworkProps {
  uri?: string | null;
  size: number;
  borderRadius?: number;
  iconSize?: number;
  style?: ViewStyle;
}

export const AlbumArtwork = React.memo(function AlbumArtwork({
  uri,
  size,
  borderRadius = Radii.sm,
  iconSize,
  style,
}: AlbumArtworkProps) {
  const computedIconSize = iconSize ?? Math.max(18, Math.round(size * 0.38));
  const isSmallListThumb = size <= 64;

  if (uri) {
    return (
      <View style={[styles.frame, { width: size, height: size, borderRadius }, style]}>
        <Image
          source={{ uri }}
          recyclingKey={uri}
          style={{ width: size, height: size, borderRadius }}
          contentFit="cover"
          transition={isSmallListThumb ? 0 : 160}
          cachePolicy="memory-disk"
          priority={isSmallListThumb ? 'normal' : 'high'}
        />
      </View>
    );
  }

  // Lightweight solid View for scrolling list rows (avoids expensive LinearGradient per row on Android)
  if (isSmallListThumb) {
    return (
      <View
        style={[
          styles.placeholderFast,
          { width: size, height: size, borderRadius },
          style,
        ]}
      >
        <Music size={computedIconSize} color={Colors.accentSecondary} strokeWidth={1.8} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...Colors.artworkPlaceholderGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.placeholder, { width: size, height: size, borderRadius }, style]}
    >
      <Music size={computedIconSize} color={Colors.accentSecondary} strokeWidth={1.8} />
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  placeholderFast: {
    backgroundColor: Colors.surfaceIconBadge,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
