import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tabs } from 'expo-router';
import { Heart, Home, Library, ListMusic, Settings } from 'lucide-react-native';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { Colors, Spacing, Typography } from '@/theme';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_CONFIG: Record<
  string,
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }
> = {
  index: { label: 'Home', Icon: Home },
  library: { label: 'Library', Icon: Library },
  playlists: { label: 'Playlists', Icon: ListMusic },
  favorites: { label: 'Favorites', Icon: Heart },
  settings: { label: 'Settings', Icon: Settings },
};

export function BottomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: TabBarProps) {
  return (
    <View style={styles.outer}>
      <MiniPlayer />
      <View
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
        ]}
      >
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.index === index;
          const color = isFocused ? Colors.accent : Colors.textMuted;
          const IconComponent = config.Icon;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const options = descriptors[route.key]?.options;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
            >
              <IconComponent
                size={21}
                color={color}
                strokeWidth={isFocused ? 2.2 : 1.8}
              />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.tabBarBackground,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBarBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...Typography.tabLabel,
  },
});
