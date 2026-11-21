import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { Song } from '@/types/music';

export function useSongSelection(songs: Song[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedIds.size > 0;

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

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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
