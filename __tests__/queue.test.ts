import {
  cycleRepeatMode,
  getNextIndex,
  getPreviousIndex,
  reorderList,
  shuffleSongs,
} from '@/utils/queue';
import type { Song } from '@/types/music';

function makeSong(id: string): Song {
  return {
    id,
    title: `Song ${id}`,
    artist: 'Artist',
    album: 'Album',
    albumId: 'alb_1',
    genre: 'Electronic',
    folder: 'Music',
    duration: 200,
    fileUri: `file:///music/${id}.mp3`,
    artworkUri: null,
    fileSize: 4_000_000,
    dateAdded: 1700000000000,
    playCount: 0,
    lastPlayedAt: null,
  };
}

describe('queue utilities', () => {
  const tracks = [makeSong('1'), makeSong('2'), makeSong('3'), makeSong('4')];

  test('shuffleSongs preserves all items and keeps pinned track at index 0', () => {
    const shuffled = shuffleSongs(tracks, '3');
    expect(shuffled).toHaveLength(4);
    expect(shuffled[0]?.id).toBe('3');
    expect(new Set(shuffled.map((s) => s.id))).toEqual(new Set(['1', '2', '3', '4']));
  });

  test('reorderList moves elements accurately without mutating source', () => {
    const original = ['a', 'b', 'c', 'd'];
    const moved = reorderList(original, 1, 3);
    expect(moved).toEqual(['a', 'c', 'd', 'b']);
    expect(original).toEqual(['a', 'b', 'c', 'd']);
  });

  test('getNextIndex handles off, all, and one repeat modes', () => {
    expect(getNextIndex(0, 3, 'off')).toBe(1);
    expect(getNextIndex(2, 3, 'off')).toBeNull();
    expect(getNextIndex(2, 3, 'all')).toBe(0);
    expect(getNextIndex(1, 3, 'one', true)).toBe(1);
    expect(getNextIndex(1, 3, 'one', false)).toBe(2);
    expect(getNextIndex(0, 0, 'all')).toBeNull();
  });

  test('getPreviousIndex wraps only in repeat all mode', () => {
    expect(getPreviousIndex(2, 3, 'off')).toBe(1);
    expect(getPreviousIndex(0, 3, 'off')).toBe(0);
    expect(getPreviousIndex(0, 3, 'all')).toBe(2);
    expect(getPreviousIndex(0, 0, 'all')).toBeNull();
  });

  test('cycleRepeatMode cycles off -> all -> one -> off', () => {
    expect(cycleRepeatMode('off')).toBe('all');
    expect(cycleRepeatMode('all')).toBe('one');
    expect(cycleRepeatMode('one')).toBe('off');
  });
});
