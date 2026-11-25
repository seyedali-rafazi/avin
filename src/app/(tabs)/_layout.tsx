import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
