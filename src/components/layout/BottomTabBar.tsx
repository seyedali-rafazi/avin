import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tabs } from 'expo-router';
import { Heart, Home, Library, ListMusic, Settings } from 'lucide-react-native';
import { Colors, Fonts, Spacing, Typography } from '@/theme';

type BaseTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

interface BottomTabBarProps extends BaseTabBarProps {
  onHeightChange?: (height: number) => void;
}

const TAB_CONFIG: Record<
  string,
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }
> = {
  index: { label: 'خانه', Icon: Home },
  library: { label: 'کتابخانه', Icon: Library },
  playlists: { label: 'پلی‌لیست‌ها', Icon: ListMusic },
  favorites: { label: 'علاقه‌مندی‌ها', Icon: Heart },
  settings: { label: 'تنظیمات', Icon: Settings },
};

export function BottomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  onHeightChange,
}: BottomTabBarProps) {
  return (
    <View
      style={styles.outer}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0) {
          onHeightChange?.(h);
        }
      }}
    >
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
          const color = isFocused ? Colors.accentSecondary : Colors.textMuted;
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
              <View style={styles.iconPill}>
                <IconComponent
                  size={20}
                  color={color}
                  strokeWidth={isFocused ? 2.2 : 1.8}
                />
              </View>
              <Text
                style={[styles.label, isFocused && styles.labelActive, { color }]}
                numberOfLines={1}
              >
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
    direction: 'rtl',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBarBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: 6,
    paddingHorizontal: Spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...Typography.tabLabel,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: Fonts.semiBold,
  },
});
