import React from 'react';
import { Easing } from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
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
  );
}
