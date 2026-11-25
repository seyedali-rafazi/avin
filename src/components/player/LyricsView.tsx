import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Edit3, FileText, Upload } from 'lucide-react-native';
import { AppModal } from '@/components/ui/AppModal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  getActiveLyricIndex,
  lyricsService,
  parseLyrics,
  type ParsedLyrics,
} from '@/services/lyrics/lyricsService';
import { useLibraryStore, usePlayerStore } from '@/stores';
import { Colors, Fonts, Radii, Spacing } from '@/theme';
import type { Song } from '@/types/music';

interface LyricsViewProps {
  song: Song;
  position: number;
  onSeek: (seconds: number) => void;
}

const LINE_HEIGHT_ESTIMATE = 42;

export function LyricsView({ song, position, onSeek }: LyricsViewProps) {
  const updateSongMetadata = useLibraryStore((s) => s.updateSongMetadata);
  const syncUpdatedSong = usePlayerStore((s) => s.syncUpdatedSong);

  const [loading, setLoading] = useState(true);
  const [parsed, setParsed] = useState<ParsedLyrics | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [draftLyrics, setDraftLyrics] = useState('');

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lastActiveIndexRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void lyricsService.loadLyricsForSong(song).then((result) => {
      if (!cancelled) {
        setParsed(result);
        setDraftLyrics(result?.raw ?? song.lyrics ?? '');
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [song]);

  const activeIndex =
    parsed && parsed.isSynced ? getActiveLyricIndex(parsed.lines, position) : -1;

  useEffect(() => {
    if (
      parsed?.isSynced &&
      activeIndex >= 0 &&
      activeIndex !== lastActiveIndexRef.current
    ) {
      lastActiveIndexRef.current = activeIndex;
      const targetY = Math.max(0, activeIndex * LINE_HEIGHT_ESTIMATE - 100);
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }
  }, [activeIndex, parsed?.isSynced]);

  const saveLyrics = (rawText: string) => {
    const cleaned = rawText.trim();
    const updated = updateSongMetadata(song.id, { lyrics: cleaned || null });
    if (updated) {
      syncUpdatedSong(updated);
    }
    setParsed(cleaned ? parseLyrics(cleaned) : null);
    setDraftLyrics(cleaned);
    setEditorVisible(false);
  };

  const handleImportLrc = async () => {
    const content = await lyricsService.pickLrcFile();
    if (content) {
      saveLyrics(content);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accentSecondary} />
          <Text style={styles.hintText}>در حال جستجوی متن آهنگ...</Text>
        </View>
      ) : !parsed || parsed.lines.length === 0 ? (
        <View style={styles.center}>
          <FileText size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>متن آهنگ پیدا نشد</Text>
          <Text style={styles.hintText}>
            فایل هم‌نام .lrc یا تگ داخلی متن برای این آهنگ موجود نیست. می‌توانید فایل .lrc وارد کنید یا متن را دستی بنویسید.
          </Text>
          <View style={styles.emptyActions}>
            <Pressable
              onPress={() => void handleImportLrc()}
              style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
            >
              <Upload size={15} color={Colors.accentSecondary} />
              <Text style={styles.actionPillText}>افزودن فایل LRC</Text>
            </Pressable>
            <Pressable
              onPress={() => setEditorVisible(true)}
              style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
            >
              <Edit3 size={15} color={Colors.textPrimary} />
              <Text style={styles.actionPillText}>نوشتن متن</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lyricsScroll}
          >
            {parsed.lines.map((line, idx) => {
              const isActive = parsed.isSynced && idx === activeIndex;
              const isPast = parsed.isSynced && activeIndex >= 0 && idx < activeIndex;
              return (
                <Pressable
                  key={`${idx}-${line.time ?? 'p'}`}
                  disabled={line.time === null}
                  onPress={() => {
                    if (line.time !== null) {
                      onSeek(line.time);
                    }
                  }}
                  style={styles.lineWrap}
                >
                  <Text
                    style={[
                      styles.lyricLine,
                      isActive && styles.lyricLineActive,
                      isPast && styles.lyricLinePast,
                    ]}
                  >
                    {line.text || '♪'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footerBar}>
            <Text style={styles.syncBadge}>
              {parsed.isSynced ? 'متن همگام با زمان (LRC)' : 'متن ساده'}
            </Text>
            <View style={styles.footerBtns}>
              <Pressable onPress={() => void handleImportLrc()} hitSlop={8}>
                <Upload size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => setEditorVisible(true)} hitSlop={8}>
                <Edit3 size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </>
      )}

      <AppModal
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        title="ویرایش متن آهنگ"
      >
        <TextInput
          value={draftLyrics}
          onChangeText={setDraftLyrics}
          placeholder="متن آهنگ یا فرمت [00:15.00] LRC را اینجا وارد کنید..."
          placeholderTextColor={Colors.textMuted}
          style={styles.editorInput}
          multiline
          textAlignVertical="top"
          textAlign="right"
        />
        <View style={styles.modalActions}>
          <Pressable
            onPress={() => setEditorVisible(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>انصراف</Text>
          </Pressable>
          <PrimaryButton
            label="ذخیره متن"
            size="sm"
            onPress={() => saveLyrics(draftLyrics)}
          />
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  hintText: {
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  actionPillText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
  lyricsScroll: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  lineWrap: {
    paddingVertical: 4,
  },
  lyricLine: {
    fontFamily: Fonts.medium,
    fontSize: 15.5,
    lineHeight: 26,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  lyricLineActive: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 30,
    color: Colors.textPrimary,
  },
  lyricLinePast: {
    color: Colors.textMuted,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.surfaceElevated,
  },
  syncBadge: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  editorInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 160,
    maxHeight: 240,
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
