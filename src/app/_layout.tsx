import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from '@expo-google-fonts/vazirmatn';
import { initializeDatabase } from '@/database/client';
import { mediaScannerService } from '@/services/media/mediaScannerService';
import {
  useLibraryStore,
  usePlayerStore,
  usePlaylistStore,
  useSearchStore,
  useSettingsStore,
} from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';

const FOREGROUND_SYNC_INTERVAL_MS = 15000;

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطای غیرمنتظره در اجرا</Text>
          <Text style={styles.errorMessage} numberOfLines={6}>
            {this.state.error.message || 'مشکلی هنگام بارگذاری صفحه رخ داد.'}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>تلاش مجدد</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

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

    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const scheduleSilentSync = (delayMs: number) => {
      const timer = setTimeout(() => {
        pendingTimers.delete(timer);
        if (AppState.currentState === 'active') {
          void useLibraryStore.getState().syncLibrarySilently();
        }
      }, delayMs);
      pendingTimers.add(timer);
    };

    // Initial silent check after startup settles to pick up songs added while the app was closed
    scheduleSilentSync(2500);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        usePlayerStore.getState().persistPlaybackState();
      } else if (nextState === 'active') {
        // Check once after Android's MediaStore finishes indexing new downloads
        scheduleSilentSync(1200);
      }
    });

    // Native observer for immediate notification on iOS
    const unsubscribeMedia = mediaScannerService.subscribeToMediaChanges(() => {
      scheduleSilentSync(600);
    });

    // Lightweight foreground head check so files added while inside the app appear automatically
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        void useLibraryStore.getState().syncLibrarySilently();
      }
    }, FOREGROUND_SYNC_INTERVAL_MS);

    return () => {
      appStateSub.remove();
      unsubscribeMedia();
      clearInterval(intervalId);
      for (const t of pendingTimers) {
        clearTimeout(t);
      }
      pendingTimers.clear();
    };
  }, []);

  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background, direction: 'rtl' },
              animation: 'ios_from_left',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen
              name="player"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="queue"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 260,
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                animation: 'fade_from_bottom',
                animationDuration: 220,
              }}
            />
            <Stack.Screen name="playlist/[id]" />
            <Stack.Screen name="library/[category]" />
            <Stack.Screen name="library/detail" />
            <Stack.Screen name="settings/about" />
          </Stack>
        </AppErrorBoundary>
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
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    direction: 'rtl',
  },
  errorTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorMessage: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  retryBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
