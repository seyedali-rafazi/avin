import React, { useCallback, useState } from 'react';
import { Easing, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { Colors } from '@/theme';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export default function TabsLayout() {
  const [tabBarHeight, setTabBarHeight] = useState(64);

  const handleHeightChange = useCallback((h: number) => {
    setTabBarHeight((prev) => (prev === h ? prev : h));
  }, []);

  const renderTabBar = useCallback(
    (props: TabBarProps) => (
      <BottomTabBar {...props} onHeightChange={handleHeightChange} />
    ),
    [handleHeightChange]
  );

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          transitionSpec: {
            animation: 'timing',
            config: {
              duration: 220,
              easing: Easing.out(Easing.cubic),
            },
          },
          sceneStyle: { backgroundColor: Colors.background, direction: 'rtl' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'خانه' }} />
        <Tabs.Screen name="library" options={{ title: 'کتابخانه' }} />
        <Tabs.Screen name="playlists" options={{ title: 'پلی‌لیست‌ها' }} />
        <Tabs.Screen name="favorites" options={{ title: 'علاقه‌مندی‌ها' }} />
        <Tabs.Screen name="settings" options={{ title: 'تنظیمات' }} />
      </Tabs>

      <MiniPlayer floating bottomOffset={tabBarHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    direction: 'rtl',
  },
});
