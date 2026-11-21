import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { getDatabase, runInTransaction } from '@/database/client';
import { playlists, playlistSongs, songs } from '@/database/schema';
import { PlaylistNameSchema, type Playlist, type Song } from '@/types/music';
import { generateId } from '@/utils/id';

export const playlistRepository = {
  getAll(): Playlist[] {
    const db = getDatabase();
    const rows = db
      .select({
        id: playlists.id,
        name: playlists.name,
        artworkUri: playlists.artworkUri,
        createdAt: playlists.createdAt,
        updatedAt: playlists.updatedAt,
        songCount: sql<number>`COUNT(${playlistSongs.id})`,
      })
      .from(playlists)
      .leftJoin(playlistSongs, eq(playlists.id, playlistSongs.playlistId))
      .groupBy(playlists.id)
      .orderBy(desc(playlists.updatedAt))
      .all();

    return rows.map((row) => {
      const covers = db
        .select({ artworkUri: songs.artworkUri })
        .from(playlistSongs)
        .innerJoin(songs, eq(playlistSongs.songId, songs.id))
        .where(eq(playlistSongs.playlistId, row.id))
        .orderBy(asc(playlistSongs.position))
        .limit(4)
        .all()
        .map((c) => c.artworkUri)
        .filter((uri): uri is string => Boolean(uri));

      return {
        id: row.id,
        name: row.name,
        artworkUri: row.artworkUri ?? covers[0] ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        songCount: Number(row.songCount),
        coverUris: covers,
      };
    });
  },

  getById(id: string): Playlist | null {
    const all = this.getAll();
    return all.find((p) => p.id === id) ?? null;
  },

  search(query: string): Playlist[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const db = getDatabase();
    const matches = db
      .select({ id: playlists.id })
      .from(playlists)
      .where(like(playlists.name, `%${trimmed}%`))
      .all();
    const matchIds = new Set(matches.map((m) => m.id));
    return this.getAll().filter((p) => matchIds.has(p.id));
  },

  create(rawName: string): Playlist {
    const name = PlaylistNameSchema.parse(rawName);
    const db = getDatabase();
    const now = Date.now();
    const id = generateId('pl');

    db.insert(playlists)
      .values({
        id,
        name,
        artworkUri: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      id,
      name,
      artworkUri: null,
      createdAt: now,
      updatedAt: now,
      songCount: 0,
      coverUris: [],
    };
  },

  rename(id: string, rawName: string): void {
    const name = PlaylistNameSchema.parse(rawName);
    const db = getDatabase();
    db.update(playlists)
      .set({ name, updatedAt: Date.now() })
      .where(eq(playlists.id, id))
      .run();
  },

  delete(id: string): void {
    const db = getDatabase();
    db.delete(playlists).where(eq(playlists.id, id)).run();
  },

  getSongs(playlistId: string): Song[] {
    const db = getDatabase();
    const rows = db
      .select({ song: songs })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.position))
      .all();

    return rows.map((r) => r.song);
  },

  addSongs(playlistId: string, songIds: string[]): void {
    if (songIds.length === 0) return;
    const db = getDatabase();
    runInTransaction(() => {
      const maxRow = db
        .select({ maxPos: sql<number | null>`MAX(${playlistSongs.position})` })
        .from(playlistSongs)
        .where(eq(playlistSongs.playlistId, playlistId))
        .get();
      let nextPos = (maxRow?.maxPos ?? -1) + 1;

      for (const songId of songIds) {
        db.insert(playlistSongs)
          .values({
            id: generateId('pls'),
            playlistId,
            songId,
            position: nextPos,
          })
          .onConflictDoNothing()
          .run();
        nextPos += 1;
      }

      db.update(playlists)
        .set({ updatedAt: Date.now() })
        .where(eq(playlists.id, playlistId))
        .run();
    });
  },

  removeSong(playlistId: string, songId: string): void {
    const db = getDatabase();
    runInTransaction(() => {
      db.delete(playlistSongs)
        .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
        .run();

      const remaining = db
        .select({ id: playlistSongs.id })
        .from(playlistSongs)
        .where(eq(playlistSongs.playlistId, playlistId))
        .orderBy(asc(playlistSongs.position))
        .all();

      remaining.forEach((row, index) => {
        db.update(playlistSongs)
          .set({ position: index })
          .where(eq(playlistSongs.id, row.id))
          .run();
      });

      db.update(playlists)
        .set({ updatedAt: Date.now() })
        .where(eq(playlists.id, playlistId))
        .run();
    });
  },

  reorderSongs(playlistId: string, orderedSongIds: string[]): void {
    const db = getDatabase();
    runInTransaction(() => {
      orderedSongIds.forEach((songId, index) => {
        db.update(playlistSongs)
          .set({ position: index })
          .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)))
          .run();
      });

      db.update(playlists)
        .set({ updatedAt: Date.now() })
        .where(eq(playlists.id, playlistId))
        .run();
    });
  },
};
