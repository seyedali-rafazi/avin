import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  FolderX,
  FolderPlus,
  HardDrive,
  Info,
  Moon,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  AudioEffectsSheet,
  BottomSheet,
  PrimaryButton,
  RangeSlider,
  ScreenContainer,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SleepTimerSheet,
} from '@/components';
import { APP_INFO, PLAYBACK_SPEEDS } from '@/constants/audio';
import { cacheService } from '@/services/storage/cacheService';
import {
  useLibraryStore,
  usePlayerStore,
  useSettingsStore,
  useSleepTimerStore,
} from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import type { RepeatMode } from '@/types/music';
import {
  formatDuration,
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

const MIN_DURATION_OPTIONS = [
  { label: 'همه فایل‌ها (بدون فیلتر)', value: 0 },
  { label: 'بالای ۱۵ ثانیه', value: 15 },
  { label: 'بالای ۳۰ ثانیه', value: 30 },
  { label: 'بالای ۶۰ ثانیه', value: 60 },
] as const;

export default function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const setDefaultRepeatMode = useSettingsStore((s) => s.setDefaultRepeatMode);
  const setShuffleByDefault = useSettingsStore((s) => s.setShuffleByDefault);
  const setDefaultPlaybackSpeed = useSettingsStore((s) => s.setDefaultPlaybackSpeed);
  const setGaplessPlayback = useSettingsStore((s) => s.setGaplessPlayback);
  const setCrossfadeSeconds = useSettingsStore((s) => s.setCrossfadeSeconds);
  const setPauseOnAudioRouteChange = useSettingsStore((s) => s.setPauseOnAudioRouteChange);
  const setMinSongDuration = useSettingsStore((s) => s.setMinSongDuration);
  const addExcludedFolder = useSettingsStore((s) => s.addExcludedFolder);
  const removeExcludedFolder = useSettingsStore((s) => s.removeExcludedFolder);

  const setPlayerRepeatMode = usePlayerStore((s) => s.setRepeatMode);
  const setPlayerRate = usePlayerStore((s) => s.setPlaybackRate);

  const sleepMode = useSleepTimerStore((s) => s.mode);
  const sleepRemaining = useSleepTimerStore((s) => s.remainingSeconds);

  const isScanning = useLibraryStore((s) => s.isScanning);
  const scanProgress = useLibraryStore((s) => s.scanProgress);
  const folders = useLibraryStore((s) => s.folders);
  const scanDevice = useLibraryStore((s) => s.scanDevice);
  const importFiles = useLibraryStore((s) => s.importFiles);
  const clearPlaybackHistory = useLibraryStore((s) => s.clearPlaybackHistory);

  const [repeatSheetVisible, setRepeatSheetVisible] = useState(false);
  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);
  const [crossfadeSheetVisible, setCrossfadeSheetVisible] = useState(false);
  const [minDurationSheetVisible, setMinDurationSheetVisible] = useState(false);
  const [blacklistSheetVisible, setBlacklistSheetVisible] = useState(false);
  const [eqSheetVisible, setEqSheetVisible] = useState(false);
  const [sleepSheetVisible, setSleepSheetVisible] = useState(false);
  const [customFolder, setCustomFolder] = useState('');
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
      const filteredMsg =
        res.filteredOut && res.filteredOut > 0
          ? `، ${formatNumber(res.filteredOut)} مورد فیلتر شد`
          : '';
      Alert.alert(
        'اسکن کتابخانه انجام شد',
        `${formatNumber(res.scanned)} فایل صوتی پیدا شد (${formatNumber(res.added)} مورد جدید، ${formatNumber(res.updated)} به‌روزرسانی، ${formatNumber(res.removed)} حذف‌شده${filteredMsg}).`
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

  const handleAddBlacklistFolder = () => {
    if (!customFolder.trim()) return;
    addExcludedFolder(customFolder.trim());
    setCustomFolder('');
  };

  const sleepStatusText =
    sleepMode === 'duration'
      ? formatDuration(sleepRemaining)
      : sleepMode === 'end-of-track'
        ? 'پایان آهنگ'
        : 'خاموش';

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
          />
          <SettingsRow
            title="پخش بدون وقفه (Gapless)"
            subtitle="پیش‌بارگذاری آهنگ بعدی برای انتقال سریع‌تر"
            switchValue={settings.gaplessPlayback}
            onSwitchChange={setGaplessPlayback}
          />
          <SettingsRow
            title="محو تدریجی بین آهنگ‌ها (Crossfade)"
            valueText={
              settings.crossfadeSeconds > 0
                ? `${formatNumber(settings.crossfadeSeconds)} ثانیه`
                : 'خاموش'
            }
            showChevron
            onPress={() => setCrossfadeSheetVisible(true)}
          />
          <SettingsRow
            title="توقف خودکار با قطع هدفون / بلوتوث"
            subtitle="همگام‌سازی فوری هنگام جدا شدن خروجی صدا"
            switchValue={settings.pauseOnAudioRouteChange}
            onSwitchChange={setPauseOnAudioRouteChange}
          />
          <SettingsRow
            title="اکولایزر و تنظیمات صدا"
            icon={<SlidersHorizontal size={18} color={Colors.accentSecondary} />}
            valueText={settings.equalizerEnabled ? 'روشن' : 'خاموش'}
            showChevron
            onPress={() => setEqSheetVisible(true)}
          />
          <SettingsRow
            title="تایمر خواب"
            icon={<Moon size={18} color={Colors.accentSecondary} />}
            valueText={sleepStatusText}
            showChevron
            onPress={() => setSleepSheetVisible(true)}
            isLast
          />
        </SettingsSection>

        {/* Scan Filters Section */}
        <SettingsSection title="فیلترهای اسکن کتابخانه">
          <SettingsRow
            title="حداقل مدت زمان آهنگ"
            subtitle="حذف ویس‌ها و فایل‌های صوتی کوتاه هنگام اسکن"
            valueText={
              settings.minSongDuration > 0
                ? `${formatNumber(settings.minSongDuration)} ثانیه`
                : 'بدون فیلتر'
            }
            showChevron
            onPress={() => setMinDurationSheetVisible(true)}
          />
          <SettingsRow
            title="پوشه‌های مسدودشده (لیست سیاه)"
            subtitle={`${formatNumber(settings.excludedFolders.length)} پوشه از اسکن حذف می‌شود`}
            rightElement={<FolderX size={18} color={Colors.textSecondary} />}
            showChevron
            onPress={() => setBlacklistSheetVisible(true)}
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
                : 'استخراج تگ‌های ID3، کاور و فایل‌های صوتی دستگاه'
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

      {/* Crossfade Slider Sheet */}
      <BottomSheet
        visible={crossfadeSheetVisible}
        onClose={() => setCrossfadeSheetVisible(false)}
        title="محو تدریجی بین آهنگ‌ها (Crossfade)"
        subtitle={
          settings.crossfadeSeconds > 0
            ? `${formatNumber(settings.crossfadeSeconds)} ثانیه هم‌پوشانی هنگام تغییر آهنگ`
            : 'خاموش'
        }
      >
        <View style={styles.sheetBox}>
          <RangeSlider
            value={settings.crossfadeSeconds}
            min={0}
            max={12}
            step={1}
            onChange={setCrossfadeSeconds}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>خاموش</Text>
            <Text style={styles.sliderLabel}>{formatNumber(6)} ثانیه</Text>
            <Text style={styles.sliderLabel}>{formatNumber(12)} ثانیه</Text>
          </View>
        </View>
      </BottomSheet>

      {/* Minimum Song Duration Sheet */}
      <BottomSheet
        visible={minDurationSheetVisible}
        onClose={() => setMinDurationSheetVisible(false)}
        title="حداقل مدت زمان آهنگ"
        subtitle="فایل‌های کوتاه‌تر از این مقدار در اسکن بعدی نادیده گرفته می‌شوند"
        options={MIN_DURATION_OPTIONS.map((opt) => ({
          label: opt.label,
          selected: settings.minSongDuration === opt.value,
          onPress: () => setMinSongDuration(opt.value),
        }))}
      />

      {/* Excluded Folders Blacklist Sheet */}
      <BottomSheet
        visible={blacklistSheetVisible}
        onClose={() => setBlacklistSheetVisible(false)}
        title="پوشه‌های مسدودشده (لیست سیاه)"
        subtitle="فایل‌های صوتی این پوشه‌ها در اسکن بعدی وارد کتابخانه نمی‌شوند"
      >
        <View style={styles.sheetBox}>
          <View style={styles.addFolderRow}>
            <TextInput
              value={customFolder}
              onChangeText={setCustomFolder}
              placeholder="نام پوشه (مثلاً WhatsApp Audio)"
              placeholderTextColor={Colors.textMuted}
              style={styles.folderInput}
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={handleAddBlacklistFolder}
            />
            <PrimaryButton
              label="افزودن"
              size="sm"
              disabled={!customFolder.trim()}
              onPress={handleAddBlacklistFolder}
            />
          </View>

          {settings.excludedFolders.length === 0 ? (
            <Text style={styles.emptyBlacklistText}>
              هیچ پوشه‌ای مسدود نشده است.
            </Text>
          ) : (
            <View style={styles.chipsWrap}>
              {settings.excludedFolders.map((folder) => (
                <View key={folder} style={styles.chip}>
                  <Text style={styles.chipText}>{folder}</Text>
                  <Pressable
                    onPress={() => removeExcludedFolder(folder)}
                    hitSlop={6}
                  >
                    <X size={14} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {folders.length > 0 ? (
            <View style={styles.quickFoldersWrap}>
              <Text style={styles.quickFoldersTitle}>افزودن سریع از پوشه‌های کتابخانه:</Text>
              <View style={styles.chipsWrap}>
                {folders
                  .filter(
                    (f) =>
                      !settings.excludedFolders.some(
                        (ex) => ex.toLowerCase() === f.name.toLowerCase()
                      )
                  )
                  .slice(0, 8)
                  .map((f) => (
                    <Pressable
                      key={f.path}
                      onPress={() => addExcludedFolder(f.name)}
                      style={styles.quickChip}
                    >
                      <Plus size={12} color={Colors.accentSecondary} />
                      <Text style={styles.chipText}>{f.name}</Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          ) : null}
        </View>
      </BottomSheet>

      <AudioEffectsSheet
        visible={eqSheetVisible}
        onClose={() => setEqSheetVisible(false)}
      />

      <SleepTimerSheet
        visible={sleepSheetVisible}
        onClose={() => setSleepSheetVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  sheetBox: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'ltr',
  },
  sliderLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  addFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  folderInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  emptyBlacklistText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.accent,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  quickFoldersWrap: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  quickFoldersTitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
