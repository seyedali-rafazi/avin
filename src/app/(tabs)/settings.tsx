import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import {
  FolderPlus,
  HardDrive,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import {
  BottomSheet,
  ScreenContainer,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
} from '@/components';
import { APP_INFO, PLAYBACK_SPEEDS } from '@/constants/audio';
import { cacheService } from '@/services/storage/cacheService';
import { useLibraryStore, usePlayerStore, useSettingsStore } from '@/stores';
import { Colors, Spacing } from '@/theme';
import type { RepeatMode } from '@/types/music';
import { formatFileSize, formatSpeedLabel } from '@/utils/format';

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: 'Off',
  all: 'Repeat All',
  one: 'Repeat One',
};

export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const setDefaultRepeatMode = useSettingsStore((s) => s.setDefaultRepeatMode);
  const setShuffleByDefault = useSettingsStore((s) => s.setShuffleByDefault);
  const setDefaultPlaybackSpeed = useSettingsStore((s) => s.setDefaultPlaybackSpeed);

  const setPlayerRepeatMode = usePlayerStore((s) => s.setRepeatMode);
  const setPlayerRate = usePlayerStore((s) => s.setPlaybackRate);

  const isScanning = useLibraryStore((s) => s.isScanning);
  const scanProgress = useLibraryStore((s) => s.scanProgress);
  const scanDevice = useLibraryStore((s) => s.scanDevice);
  const importFiles = useLibraryStore((s) => s.importFiles);
  const clearPlaybackHistory = useLibraryStore((s) => s.clearPlaybackHistory);

  const [repeatSheetVisible, setRepeatSheetVisible] = useState(false);
  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);
  const [cacheBytes, setCacheBytes] = useState(0);

  useEffect(() => {
    void cacheService.getCacheSizeBytes().then(setCacheBytes);
  }, []);

  const handleRescan = async () => {
    const res = await scanDevice();
    if (res.requiresDevBuild) {
      Alert.alert(
        'Development Build Required',
        res.error ?? 'Use Import Audio Files to load local music in Expo Go.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import Files', onPress: () => void handleImport() },
        ]
      );
    } else if (res.error) {
      Alert.alert('Rescan Library', res.error);
    } else {
      Alert.alert(
        'Library Rescanned',
        `Discovered ${res.scanned} audio files (${res.added} added, ${res.updated} updated, ${res.removed} removed).`
      );
    }
  };

  const handleImport = async () => {
    const res = await importFiles();
    if (res.error) {
      Alert.alert('Import Error', res.error);
    } else if (res.added > 0) {
      Alert.alert('Import Complete', `Added ${res.added} audio files to your library.`);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Playback History',
      'This removes your Recently Played history and resets play counts. Your songs and playlists will stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearPlaybackHistory(),
        },
      ]
    );
  };

  const handleClearCache = async () => {
    await cacheService.clearCache();
    const updated = await cacheService.getCacheSizeBytes();
    setCacheBytes(updated);
    Alert.alert('Cache Cleared', 'Cached artwork and temporary files have been cleared.');
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenHeader title="Settings" />

        {/* Playback Section */}
        <SettingsSection title="Playback">
          <SettingsRow
            title="Default Repeat Mode"
            valueText={REPEAT_LABELS[settings.defaultRepeatMode]}
            showChevron
            onPress={() => setRepeatSheetVisible(true)}
          />
          <SettingsRow
            title="Shuffle by Default"
            switchValue={settings.shuffleByDefault}
            onSwitchChange={setShuffleByDefault}
          />
          <SettingsRow
            title="Playback Speed"
            valueText={formatSpeedLabel(settings.defaultPlaybackSpeed)}
            showChevron
            onPress={() => setSpeedSheetVisible(true)}
            isLast
          />
        </SettingsSection>

        {/* Library Section matching Reference Screen #6 */}
        <SettingsSection title="Library">
          <SettingsRow
            title="Rescan Library"
            subtitle={
              isScanning && scanProgress
                ? `Scanning ${scanProgress.scanned} files...`
                : 'Scan device storage for local audio files'
            }
            rightElement={
              isScanning ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <RefreshCw size={18} color={Colors.textSecondary} />
              )
            }
            onPress={() => void handleRescan()}
          />
          <SettingsRow
            title="Import Audio Files"
            subtitle="Add local tracks from device folders"
            rightElement={<FolderPlus size={18} color={Colors.textSecondary} />}
            onPress={() => void handleImport()}
          />
          <SettingsRow
            title="Clear Playback History"
            rightElement={<Trash2 size={18} color={Colors.textSecondary} />}
            onPress={handleClearHistory}
          />
          <SettingsRow
            title="Manage Cache"
            subtitle={`Current cache: ${formatFileSize(cacheBytes)}`}
            rightElement={<HardDrive size={18} color={Colors.textSecondary} />}
            onPress={() => void handleClearCache()}
            isLast
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsRow
            title="App Information"
            icon={<Info size={19} color={Colors.textSecondary} />}
            valueText={`v${APP_INFO.version}`}
            showChevron
            onPress={() => router.push('/settings/about')}
            isLast
          />
        </SettingsSection>
      </ScrollView>

      <BottomSheet
        visible={repeatSheetVisible}
        onClose={() => setRepeatSheetVisible(false)}
        title="Default Repeat Mode"
        options={(['off', 'all', 'one'] as RepeatMode[]).map((mode) => ({
          label: REPEAT_LABELS[mode],
          selected: settings.defaultRepeatMode === mode,
          onPress: () => {
            setDefaultRepeatMode(mode);
            setPlayerRepeatMode(mode);
          },
        }))}
      />

      <BottomSheet
        visible={speedSheetVisible}
        onClose={() => setSpeedSheetVisible(false)}
        title="Default Playback Speed"
        options={PLAYBACK_SPEEDS.map((speed) => ({
          label: formatSpeedLabel(speed),
          selected: settings.defaultPlaybackSpeed === speed,
          onPress: () => {
            setDefaultPlaybackSpeed(speed);
            setPlayerRate(speed);
          },
        }))}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
});
