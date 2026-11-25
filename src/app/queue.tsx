import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  ListMusic,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  AlbumArtwork,
  EmptyState,
  IconButton,
  ScreenContainer,
} from '@/components';
import { usePlayerStore } from '@/stores';
import { Colors, Fonts, Layout, Radii, Spacing, Typography } from '@/theme';
import { localizeMetadata } from '@/utils/format';

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playSongAtIndex = usePlayerStore((s) => s.playSongAtIndex);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const shuffleCurrentQueue = usePlayerStore((s) => s.shuffleCurrentQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

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

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={Typography.greeting}>صف پخش</Text>
        <IconButton
          icon={<X size={22} color={Colors.textPrimary} />}
          onPress={() => router.back()}
          accessibilityLabel="بستن صف پخش"
        />
      </View>

      {queue.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={30} color={Colors.accent} />}
          title="صف پخش خالی است"
          description="یک آهنگ یا پلی‌لیست را پخش کنید تا صف پخش شما اینجا نمایش داده شود."
        />
      ) : (
        <>
          <FlatList
            data={queue}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const isCurrent = index === currentIndex;
              return (
                <Pressable
                  onPress={() => void playSongAtIndex(index)}
                  style={({ pressed }) => [
                    styles.row,
                    isCurrent && styles.currentRow,
                    pressed && styles.pressed,
                  ]}
                >
                  {isCurrent ? <View style={styles.activeAccentBar} /> : null}

                  <AlbumArtwork
                    uri={item.artworkUri}
                    size={46}
                    borderRadius={Radii.sm}
                  />

                  <View style={styles.info}>
                    <Text
                      style={[styles.title, isCurrent && styles.currentTitle]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                      {localizeMetadata(item.artist, 'هنرمند ناشناس')}
                    </Text>
                  </View>

                  {isCurrent ? (
                    <View style={styles.equalizerWrap}>
                      <AudioLines size={20} color={Colors.accent} />
                    </View>
                  ) : (
                    <View style={styles.rowActions}>
                      {index > 0 ? (
                        <Pressable
                          onPress={() => reorderQueue(index, index - 1)}
                          hitSlop={8}
                          style={styles.reorderBtn}
                          accessibilityLabel={`انتقال ${item.title} به بالا`}
                        >
                          <ChevronUp size={16} color={Colors.textSecondary} />
                        </Pressable>
                      ) : null}
                      {index < queue.length - 1 ? (
                        <Pressable
                          onPress={() => reorderQueue(index, index + 1)}
                          hitSlop={8}
                          style={styles.reorderBtn}
                          accessibilityLabel={`انتقال ${item.title} به پایین`}
                        >
                          <ChevronDown size={16} color={Colors.textSecondary} />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => removeFromQueue(index)}
                        hitSlop={8}
                        style={styles.reorderBtn}
                        accessibilityLabel={`حذف ${item.title} از صف پخش`}
                      >
                        <X size={15} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            }}
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
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.lg,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    gap: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  currentRow: {
    backgroundColor: Colors.surfaceHighlight,
  },
  activeAccentBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  pressed: {
    opacity: 0.78,
  },
  info: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  currentTitle: {
    fontFamily: Fonts.semiBold,
    color: Colors.accentSecondary,
  },
  artist: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  equalizerWrap: {
    paddingLeft: 4,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
});
