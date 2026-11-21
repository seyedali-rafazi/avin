import { asc, desc, eq } from 'drizzle-orm';
import { getDatabase } from '@/database/client';
import { favorites, songs } from '@/database/schema';
import type { Song, SortField, SortOrder } from '@/types/music';
import { generateId } from '@/utils/id';

export const favoritesRepository = {
  getFavoriteSongIds(): string[] {
    const db = getDatabase();
    return db
      .select({ songId: favorites.songId })
      .from(favorites)
      .orderBy(desc(favorites.createdAt))
      .all()
      .map((r) => r.songId);
  },

  getFavoriteSongs(sortBy: SortField = 'dateAdded', order: SortOrder = 'desc'): Song[] {
    const db = getDatabase();
    const orderExpr = (() => {
      switch (sortBy) {
        case 'title':
          return order === 'desc' ? desc(songs.title) : asc(songs.title);
        case 'artist':
          return order === 'desc' ? desc(songs.artist) : asc(songs.artist);
        case 'album':
          return order === 'desc' ? desc(songs.album) : asc(songs.album);
        case 'duration':
          return order === 'desc' ? desc(songs.duration) : asc(songs.duration);
        case 'playCount':
          return order === 'desc' ? desc(songs.playCount) : asc(songs.playCount);
        case 'dateAdded':
        default:
          return order === 'desc' ? desc(favorites.createdAt) : asc(favorites.createdAt);
      }
    })();

    return db
      .select({ song: songs })
      .from(favorites)
      .innerJoin(songs, eq(favorites.songId, songs.id))
      .orderBy(orderExpr)
      .all()
      .map((r) => r.song);
  },

  isFavorite(songId: string): boolean {
    const db = getDatabase();
    const row = db
      .select({ id: favorites.id })
      .from(favorites)
      .where(eq(favorites.songId, songId))
      .get();
    return Boolean(row);
  },

  add(songId: string): void {
    const db = getDatabase();
    db.insert(favorites)
      .values({
        id: generateId('fav'),
        songId,
        createdAt: Date.now(),
      })
      .onConflictDoNothing()
      .run();
  },

  remove(songId: string): void {
    const db = getDatabase();
    db.delete(favorites).where(eq(favorites.songId, songId)).run();
  },

  toggle(songId: string): boolean {
    if (this.isFavorite(songId)) {
      this.remove(songId);
      return false;
    }
    this.add(songId);
    return true;
  },
};
