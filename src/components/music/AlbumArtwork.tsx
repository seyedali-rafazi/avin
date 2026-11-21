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

  if (uri) {
    return (
      <View style={[styles.frame, { width: size, height: size, borderRadius }, style]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius }}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
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
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
