import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  ListMusic,
  ListPlus,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  AppModal,
  DraggableSongList,
  EmptyState,
  IconButton,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { usePlayerStore, usePlaylistStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing, Typography } from '@/theme';
import { formatSongCount } from '@/utils/format';

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playSongAtIndex = usePlayerStore((s) => s.playSongAtIndex);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const shuffleCurrentQueue = usePlayerStore((s) => s.shuffleCurrentQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const createPlaylistWithSongs = usePlaylistStore((s) => s.createPlaylistWithSongs);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const handleClearQueue = () => {
    Alert.alert(
      'پاک کردن صف پخش',
      'پخش متوقف شود و همه آهنگ‌ها از صف پخش حذف شوند؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'پاک کردن',
          style: 'destructive',
          onPress: () => {
            void clearQueue();
            router.back();
          },
        },
      ]
    );
  };

  const handleSaveAsPlaylist = () => {
    const trimmed = playlistName.trim();
    if (!trimmed) {
      Alert.alert('نام نامعتبر', 'لطفاً یک نام برای پلی‌لیست وارد کنید.');
      return;
    }
    const songIds = queue.map((s) => s.id);
    const created = createPlaylistWithSongs(trimmed, songIds);
    setSaveModalVisible(false);
    setPlaylistName('');
    if (created) {
      Alert.alert(
        'ذخیره شد',
        `پلی‌لیست «${created.name}» با ${formatSongCount(songIds.length)} ساخته شد.`
      );
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMeta}>
          <Text style={Typography.greeting}>صف پخش</Text>
          {queue.length > 0 ? (
            <Text style={styles.headerSub}>
              {formatSongCount(queue.length)} • برای تغییر ترتیب، دستگیره را بکشید
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {queue.length > 0 ? (
            <IconButton
              icon={<ListPlus size={21} color={Colors.accentSecondary} />}
              onPress={() => setSaveModalVisible(true)}
              accessibilityLabel="ذخیره صف به‌عنوان پلی‌لیست"
            />
          ) : null}
          <IconButton
            icon={<X size={22} color={Colors.textPrimary} />}
            onPress={() => router.back()}
            accessibilityLabel="بستن صف پخش"
          />
        </View>
      </View>

      {queue.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={30} color={Colors.accent} />}
          title="صف پخش خالی است"
          description="یک آهنگ یا پلی‌لیست را پخش کنید تا صف پخش شما اینجا نمایش داده شود."
        />
      ) : (
        <>
          <DraggableSongList
            songs={queue}
            currentIndex={currentIndex}
            onPressSong={(idx) => void playSongAtIndex(idx)}
            onReorder={reorderQueue}
            onRemoveSong={removeFromQueue}
          />

          {/* Bottom Shuffle & Clear Queue Buttons */}
          <View style={styles.footer}>
            <Pressable
              onPress={shuffleCurrentQueue}
              style={({ pressed }) => [styles.footerBtn, pressed && styles.pressed]}
            >
              <Shuffle size={17} color={Colors.accentSecondary} />
              <Text style={styles.footerBtnText}>پخش تصادفی</Text>
            </Pressable>

            <Pressable
              onPress={handleClearQueue}
              style={({ pressed }) => [styles.footerBtn, pressed && styles.pressed]}
            >
              <Trash2 size={17} color={Colors.textSecondary} />
              <Text style={styles.footerBtnText}>پاک کردن صف</Text>
            </Pressable>
          </View>
        </>
      )}

      <AppModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        title="ذخیره صف به‌عنوان پلی‌لیست"
      >
        <TextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="نام پلی‌لیست جدید..."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          autoFocus
          maxLength={60}
          selectionColor={Colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleSaveAsPlaylist}
          textAlign="right"
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setSaveModalVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>انصراف</Text>
          </Pressable>
          <PrimaryButton
            label="ذخیره پلی‌لیست"
            size="sm"
            onPress={handleSaveAsPlaylist}
          />
        </View>
      </AppModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerMeta: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.78,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  footerBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  footerBtnText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    fontSize: 13.5,
  },
});
