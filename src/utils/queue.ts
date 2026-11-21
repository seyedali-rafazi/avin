import type { RepeatMode, Song } from '@/types/music';

/**
 * Fisher-Yates shuffle that optionally keeps a pinned song at index 0.
 */
export function shuffleSongs(songs: Song[], pinnedSongId?: string): Song[] {
  if (songs.length <= 1) return [...songs];
  const pinned = pinnedSongId ? songs.find((s) => s.id === pinnedSongId) : undefined;
  const rest = pinned ? songs.filter((s) => s.id !== pinned.id) : [...songs];

  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = rest[i]!;
    rest[i] = rest[j]!;
    rest[j] = tmp;
  }

  return pinned ? [pinned, ...rest] : rest;
}

export function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved !== undefined) {
    next.splice(toIndex, 0, moved);
  }
  return next;
}

export function getNextIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: RepeatMode,
  isAutomatic = false
): number | null {
  if (queueLength === 0) return null;
  if (isAutomatic && repeatMode === 'one') {
    return currentIndex >= 0 ? currentIndex : 0;
  }
  if (currentIndex + 1 < queueLength) {
    return currentIndex + 1;
  }
  if (repeatMode === 'all') {
    return 0;
  }
  return null;
}

export function getPreviousIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: RepeatMode
): number | null {
  if (queueLength === 0) return null;
  if (currentIndex > 0) {
    return currentIndex - 1;
  }
  if (repeatMode === 'all') {
    return queueLength - 1;
  }
  return 0;
}

export function cycleRepeatMode(current: RepeatMode): RepeatMode {
  if (current === 'off') return 'all';
  if (current === 'all') return 'one';
  return 'off';
}
