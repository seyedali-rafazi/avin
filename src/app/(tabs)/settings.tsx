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
import {
  formatFileSize,
  formatNumber,
  formatSpeedLabel,
  toPersianDigits,
} from '@/utils/format';

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: 'خاموش',
  all: 'تکرار همه',
  one: 'تکرار یک آهنگ',
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
        'نیازمند نسخه نصبی',
        res.error ?? 'برای وارد کردن فایل‌های صوتی از گزینه افزودن فایل استفاده کنید.',
        [
          { text: 'انصراف', style: 'cancel' },
          { text: 'افزودن فایل', onPress: () => void handleImport() },
        ]
      );
    } else if (res.error) {
      Alert.alert('اسکن مجدد کتابخانه', res.error);
    } else {
      Alert.alert(
        'اسکن کتابخانه انجام شد',
        `${formatNumber(res.scanned)} فایل صوتی پیدا شد (${formatNumber(res.added)} مورد جدید، ${formatNumber(res.updated)} به‌روزرسانی، ${formatNumber(res.removed)} حذف‌شده).`
      );
    }
  };

  const handleImport = async () => {
    const res = await importFiles();
    if (res.error) {
      Alert.alert('خطا در افزودن فایل', res.error);
    } else if (res.added > 0) {
      Alert.alert(
        'افزودن انجام شد',
        `${formatNumber(res.added)} فایل صوتی به کتابخانه شما اضافه شد.`
      );
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'پاک کردن تاریخچه پخش',
      'لیست اخیراً پخش‌شده و تعداد دفعات پخش پاک می‌شود. آهنگ‌ها و پلی‌لیست‌های شما دست‌نخورده باقی می‌مانند.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'پاک کردن',
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
    Alert.alert('حافظه پنهان پاک شد', 'تصاویر کاور و فایل‌های موقت با موفقیت پاک شدند.');
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScreenHeader title="تنظیمات" />

        {/* Playback Section */}
        <SettingsSection title="پخش موسیقی">
          <SettingsRow
            title="حالت تکرار پیش‌فرض"
            valueText={REPEAT_LABELS[settings.defaultRepeatMode]}
            showChevron
            onPress={() => setRepeatSheetVisible(true)}
          />
          <SettingsRow
            title="پخش تصادفی پیش‌فرض"
            switchValue={settings.shuffleByDefault}
            onSwitchChange={setShuffleByDefault}
          />
          <SettingsRow
            title="سرعت پخش"
            valueText={formatSpeedLabel(settings.defaultPlaybackSpeed)}
            showChevron
            onPress={() => setSpeedSheetVisible(true)}
            isLast
          />
        </SettingsSection>

        {/* Library Section */}
        <SettingsSection title="کتابخانه">
          <SettingsRow
            title="اسکن مجدد کتابخانه"
            subtitle={
              isScanning && scanProgress
                ? `در حال اسکن ${formatNumber(scanProgress.scanned)} فایل...`
                : 'جستجوی فایل‌های صوتی در حافظه دستگاه'
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
            title="افزودن فایل‌های صوتی"
            subtitle="انتخاب دستی آهنگ‌ها از پوشه‌های دستگاه"
            rightElement={<FolderPlus size={18} color={Colors.textSecondary} />}
            onPress={() => void handleImport()}
          />
          <SettingsRow
            title="پاک کردن تاریخچه پخش"
            rightElement={<Trash2 size={18} color={Colors.textSecondary} />}
            onPress={handleClearHistory}
          />
          <SettingsRow
            title="مدیریت حافظه پنهان"
            subtitle={`حجم فعلی: ${formatFileSize(cacheBytes)}`}
            rightElement={<HardDrive size={18} color={Colors.textSecondary} />}
            onPress={() => void handleClearCache()}
            isLast
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="درباره برنامه">
          <SettingsRow
            title="اطلاعات برنامه"
            icon={<Info size={19} color={Colors.textSecondary} />}
            valueText={`نسخه ${toPersianDigits(APP_INFO.version)}`}
            showChevron
            onPress={() => router.push('/settings/about')}
            isLast
          />
        </SettingsSection>
      </ScrollView>

      <BottomSheet
        visible={repeatSheetVisible}
        onClose={() => setRepeatSheetVisible(false)}
        title="حالت تکرار پیش‌فرض"
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
        title="سرعت پخش پیش‌فرض"
        options={PLAYBACK_SPEEDS.map((speed) => ({
          label: `${formatSpeedLabel(speed)}${speed === 1.0 ? ' (عادی)' : ''}`,
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
