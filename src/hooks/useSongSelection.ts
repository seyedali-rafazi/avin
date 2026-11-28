import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Song } from '@/types/music';

export function useSongSelection(songs: Song[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedIds.size > 0;

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Pressing the Android hardware back button exits selection mode instead of leaving the screen/app
  useEffect(() => {
    if (!isSelectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSelection();
      return true;
    });
    return () => sub.remove();
  }, [isSelectionMode, clearSelection]);

  const enterSelection = useCallback((songId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(songId);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((songId: string) => {
    void Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    void Haptics.selectionAsync();
    setSelectedIds(new Set(songs.map((s) => s.id)));
  }, [songs]);

  const selectedSongs = useMemo(
    () => songs.filter((s) => selectedIds.has(s.id)),
    [songs, selectedIds]
  );

  const allSelected = songs.length > 0 && selectedIds.size === songs.length;

  return {
    selectedIds,
    selectedSongs,
    isSelectionMode,
    allSelected,
    enterSelection,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
