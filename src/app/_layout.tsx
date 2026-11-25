import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from '@expo-google-fonts/vazirmatn';
import { initializeDatabase } from '@/database/client';
import {
  useLibraryStore,
  usePlayerStore,
  usePlaylistStore,
  useSearchStore,
  useSettingsStore,
} from '@/stores';
import { Colors } from '@/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
  });

  useEffect(() => {
    try {
      initializeDatabase();
      useSettingsStore.getState().loadSettings();
      useLibraryStore.getState().refreshLibrary();
      usePlaylistStore.getState().refreshPlaylists();
      useSearchStore.getState().loadHistory();
      usePlayerStore.getState().initializePlayer();
    } catch {
      // Allow UI to render gracefully even if DB init encounters an issue
    } finally {
      setReady(true);
    }
  }, []);

  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background, direction: 'rtl' },
            animation: 'slide_from_left',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen
            name="player"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="queue"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="search" />
          <Stack.Screen name="playlist/[id]" />
          <Stack.Screen name="library/[category]" />
          <Stack.Screen name="library/detail" />
          <Stack.Screen name="settings/about" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    direction: 'rtl',
  },
});
