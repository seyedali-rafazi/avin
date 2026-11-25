import { asc, desc, eq, gt, inArray, isNotNull, like, or, sql } from 'drizzle-orm';
import { getDatabase, runInTransaction } from '@/database/client';
import { albums, artists, playbackHistory, songs } from '@/database/schema';
import type {
  Album,
  Artist,
  FolderInfo,
  GenreInfo,
  ListeningStats,
  Song,
  SongMetadataPatch,
  SortField,
  SortOrder,
} from '@/types/music';
import { generateId, stableId } from '@/utils/id';

export type NewSongInput = Omit<Song, 'playCount' | 'lastPlayedAt' | 'isUserEdited'>;

type SongRowDb = typeof songs.$inferSelect;

function mapRowToSong(row: SongRowDb): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    albumId: row.albumId,
    genre: row.genre,
    folder: row.folder,
    duration: row.duration,
    fileUri: row.fileUri,
    artworkUri: row.artworkUri,
    fileSize: row.fileSize,
    dateAdded: row.dateAdded,
    playCount: row.playCount,
    lastPlayedAt: row.lastPlayedAt,
    year: row.year ?? null,
    lyrics: row.lyrics ?? null,
    isUserEdited: Boolean(row.isUserEdited),
  };
}

function getSortColumn(field: SortField) {
  switch (field) {
    case 'artist':
      return songs.artist;
    case 'album':
      return songs.album;
    case 'dateAdded':
      return songs.dateAdded;
    case 'duration':
      return songs.duration;
    case 'playCount':
      return songs.playCount;
    case 'title':
    default:
      return songs.title;
  }
}

export const songRepository = {
  getAll(sortBy: SortField = 'title', order: SortOrder = 'asc'): Song[] {
    const db = getDatabase();
    const col = getSortColumn(sortBy);
    return db
      .select()
      .from(songs)
      .orderBy(order === 'desc' ? desc(col) : asc(col))
      .all()
      .map(mapRowToSong);
  },

  getById(id: string): Song | null {
    const db = getDatabase();
    const row = db.select().from(songs).where(eq(songs.id, id)).get();
    return row ? mapRowToSong(row) : null;
  },

  getByIds(ids: string[]): Song[] {
    if (ids.length === 0) return [];
    const db = getDatabase();
    return db.select().from(songs).where(inArray(songs.id, ids)).all().map(mapRowToSong);
  },

  getRecentlyAdded(limit = 50): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .orderBy(desc(songs.dateAdded))
      .limit(limit)
      .all()
      .map(mapRowToSong);
  },

  getRecentlyPlayed(limit = 50): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(isNotNull(songs.lastPlayedAt))
      .orderBy(desc(songs.lastPlayedAt))
      .limit(limit)
      .all()
      .map(mapRowToSong);
  },

  getMostPlayed(limit = 50): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(gt(songs.playCount, 0))
      .orderBy(desc(songs.playCount), desc(songs.lastPlayedAt))
      .limit(limit)
      .all()
      .map(mapRowToSong);
  },

  getNeverPlayed(limit = 100): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(eq(songs.playCount, 0))
      .orderBy(desc(songs.dateAdded))
      .limit(limit)
      .all()
      .map(mapRowToSong);
  },

  getListeningStats(): ListeningStats {
    const db = getDatabase();
    const agg = db
      .select({
        totalPlays: sql<number>`COALESCE(SUM(${songs.playCount}), 0)`,
        totalSongs: sql<number>`COUNT(*)`,
        playedSongsCount: sql<number>`SUM(CASE WHEN ${songs.playCount} > 0 THEN 1 ELSE 0 END)`,
        totalDurationSeconds: sql<number>`COALESCE(SUM(${songs.duration} * ${songs.playCount}), 0)`,
      })
      .from(songs)
      .get();

    const topArtistRow = db
      .select({
        artist: songs.artist,
        plays: sql<number>`SUM(${songs.playCount})`,
      })
      .from(songs)
      .where(gt(songs.playCount, 0))
      .groupBy(songs.artist)
      .orderBy(desc(sql`SUM(${songs.playCount})`))
      .limit(1)
      .get();

    const topSongRow = db
      .select()
      .from(songs)
      .where(gt(songs.playCount, 0))
      .orderBy(desc(songs.playCount), desc(songs.lastPlayedAt))
      .limit(1)
      .get();

    return {
      totalPlays: Number(agg?.totalPlays ?? 0),
      totalSongs: Number(agg?.totalSongs ?? 0),
      playedSongsCount: Number(agg?.playedSongsCount ?? 0),
      totalDurationSeconds: Number(agg?.totalDurationSeconds ?? 0),
      topArtist: topArtistRow?.artist ?? null,
      topSong: topSongRow ? mapRowToSong(topSongRow) : null,
    };
  },

  getByAlbum(albumName: string): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(eq(songs.album, albumName))
      .orderBy(asc(songs.title))
      .all()
      .map(mapRowToSong);
  },

  getByArtist(artistName: string): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(eq(songs.artist, artistName))
      .orderBy(asc(songs.title))
      .all()
      .map(mapRowToSong);
  },

  getByGenre(genreName: string): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(eq(songs.genre, genreName))
      .orderBy(asc(songs.title))
      .all()
      .map(mapRowToSong);
  },

  getByFolder(folderName: string): Song[] {
    const db = getDatabase();
    return db
      .select()
      .from(songs)
      .where(eq(songs.folder, folderName))
      .orderBy(asc(songs.title))
      .all()
      .map(mapRowToSong);
  },

  search(query: string, limit = 100): Song[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const db = getDatabase();
    const pattern = `%${trimmed}%`;
    return db
      .select()
      .from(songs)
      .where(
        or(
          like(songs.title, pattern),
          like(songs.artist, pattern),
          like(songs.album, pattern),
          like(songs.genre, pattern)
        )
      )
      .orderBy(asc(songs.title))
      .limit(limit)
      .all()
      .map(mapRowToSong);
  },

  getAlbums(): Album[] {
    const db = getDatabase();
    const rows = db
      .select({
        album: songs.album,
        artist: sql<string>`MIN(${songs.artist})`,
        artworkUri: sql<string | null>`MAX(${songs.artworkUri})`,
        year: sql<number | null>`MAX(${songs.year})`,
        songCount: sql<number>`COUNT(*)`,
      })
      .from(songs)
      .groupBy(songs.album)
      .orderBy(asc(songs.album))
      .all();

    return rows.map((r) => ({
      id: stableId('alb', r.album),
      title: r.album,
      artist: r.artist || 'Unknown Artist',
      artworkUri: r.artworkUri ?? null,
      year: r.year ?? null,
      songCount: Number(r.songCount),
    }));
  },

  getArtists(): Artist[] {
    const db = getDatabase();
    const rows = db
      .select({
        name: songs.artist,
        artworkUri: sql<string | null>`MAX(${songs.artworkUri})`,
        songCount: sql<number>`COUNT(*)`,
        albumCount: sql<number>`COUNT(DISTINCT ${songs.album})`,
      })
      .from(songs)
      .groupBy(songs.artist)
      .orderBy(asc(songs.artist))
      .all();

    return rows.map((r) => ({
      id: stableId('art', r.name),
      name: r.name,
      artworkUri: r.artworkUri ?? null,
      songCount: Number(r.songCount),
      albumCount: Number(r.albumCount),
    }));
  },

  getGenres(): GenreInfo[] {
    const db = getDatabase();
    const rows = db
      .select({
        name: songs.genre,
        songCount: sql<number>`COUNT(*)`,
      })
      .from(songs)
      .groupBy(songs.genre)
      .orderBy(asc(songs.genre))
      .all();

    return rows.map((r) => ({
      name: r.name,
      songCount: Number(r.songCount),
    }));
  },

  getFolders(): FolderInfo[] {
    const db = getDatabase();
    const rows = db
      .select({
        path: songs.folder,
        songCount: sql<number>`COUNT(*)`,
      })
      .from(songs)
      .groupBy(songs.folder)
      .orderBy(asc(songs.folder))
      .all();

    return rows.map((r) => {
      const segments = r.path.split('/').filter(Boolean);
      const name = segments[segments.length - 1] ?? r.path;
      return {
        path: r.path,
        name,
        songCount: Number(r.songCount),
      };
    });
  },

  updateMetadata(songId: string, patch: SongMetadataPatch): Song | null {
    const db = getDatabase();
    const existing = this.getById(songId);
    if (!existing) return null;

    const nextTitle = patch.title?.trim() || existing.title;
    const nextArtist = patch.artist?.trim() || existing.artist;
    const nextAlbum = patch.album?.trim() || existing.album;
    const nextGenre = patch.genre?.trim() || existing.genre;
    const nextYear = patch.year !== undefined ? patch.year : existing.year ?? null;
    const nextArtwork = patch.artworkUri !== undefined ? patch.artworkUri : existing.artworkUri;
    const nextLyrics = patch.lyrics !== undefined ? patch.lyrics : existing.lyrics ?? null;
    const nextAlbumId = stableId('alb', nextAlbum);

    db.update(songs)
      .set({
        title: nextTitle,
        artist: nextArtist,
        album: nextAlbum,
        albumId: nextAlbumId,
        genre: nextGenre,
        year: nextYear,
        artworkUri: nextArtwork,
        lyrics: nextLyrics,
        isUserEdited: 1,
      })
      .where(eq(songs.id, songId))
      .run();

    return this.getById(songId);
  },

  upsertBatch(items: NewSongInput[]): { added: number; updated: number } {
    if (items.length === 0) return { added: 0, updated: 0 };
    const db = getDatabase();
    let added = 0;
    let updated = 0;

    runInTransaction(() => {
      const existingRows = db
        .select({
          id: songs.id,
          fileUri: songs.fileUri,
          isUserEdited: songs.isUserEdited,
          artworkUri: songs.artworkUri,
          lyrics: songs.lyrics,
        })
        .from(songs)
        .all();
      const existingByUri = new Map(existingRows.map((r) => [r.fileUri, r]));

      const seenAlbums = new Map<
        string,
        { title: string; artist: string; artworkUri: string | null; year: number | null }
      >();
      const seenArtists = new Map<string, { name: string; artworkUri: string | null }>();

      for (const item of items) {
        const existing = existingByUri.get(item.fileUri);
        if (existing) {
          if (existing.isUserEdited) {
            // Preserve user's manual tag edits; only refresh duration/fileSize/folder
            db.update(songs)
              .set({
                folder: item.folder,
                duration: item.duration > 0 ? item.duration : undefined,
                fileSize: item.fileSize > 0 ? item.fileSize : undefined,
                artworkUri: existing.artworkUri ?? item.artworkUri,
                lyrics: existing.lyrics ?? item.lyrics ?? null,
              })
              .where(eq(songs.id, existing.id))
              .run();
          } else {
            db.update(songs)
              .set({
                title: item.title,
                artist: item.artist,
                album: item.album,
                albumId: item.albumId,
                genre: item.genre,
                folder: item.folder,
                duration: item.duration,
                artworkUri: item.artworkUri ?? existing.artworkUri,
                fileSize: item.fileSize,
                dateAdded: item.dateAdded,
                year: item.year ?? null,
                lyrics: item.lyrics ?? existing.lyrics ?? null,
              })
              .where(eq(songs.id, existing.id))
              .run();
          }
          updated += 1;
        } else {
          db.insert(songs)
            .values({
              ...item,
              year: item.year ?? null,
              lyrics: item.lyrics ?? null,
              isUserEdited: 0,
              playCount: 0,
              lastPlayedAt: null,
            })
            .onConflictDoNothing()
            .run();
          added += 1;
        }

        const albumId = item.albumId ?? stableId('alb', item.album);
        if (!seenAlbums.has(albumId)) {
          seenAlbums.set(albumId, {
            title: item.album,
            artist: item.artist,
            artworkUri: item.artworkUri,
            year: item.year ?? null,
          });
        }
        const artistId = stableId('art', item.artist);
        if (!seenArtists.has(artistId)) {
          seenArtists.set(artistId, {
            name: item.artist,
            artworkUri: item.artworkUri,
          });
        }
      }

      for (const [id, alb] of seenAlbums.entries()) {
        db.insert(albums)
          .values({
            id,
            title: alb.title,
            artist: alb.artist,
            artworkUri: alb.artworkUri,
            year: alb.year,
          })
          .onConflictDoUpdate({
            target: albums.id,
            set: { artist: alb.artist, artworkUri: alb.artworkUri, year: alb.year },
          })
          .run();
      }

      for (const [id, art] of seenArtists.entries()) {
        db.insert(artists)
          .values({ id, name: art.name, artworkUri: art.artworkUri })
          .onConflictDoNothing()
          .run();
      }
    });

    return { added, updated };
  },

  deleteById(id: string): void {
    const db = getDatabase();
    db.delete(songs).where(eq(songs.id, id)).run();
  },

  deleteByIds(ids: string[]): void {
    if (ids.length === 0) return;
    const db = getDatabase();
    runInTransaction(() => {
      db.delete(songs).where(inArray(songs.id, ids)).run();
    });
  },

  pruneMissingUris(validUris: Set<string>): number {
    const db = getDatabase();
    const all = db.select({ id: songs.id, fileUri: songs.fileUri }).from(songs).all();
    const toRemove = all.filter((s) => !validUris.has(s.fileUri)).map((s) => s.id);
    if (toRemove.length === 0) return 0;

    runInTransaction(() => {
      db.delete(songs).where(inArray(songs.id, toRemove)).run();
    });
    return toRemove.length;
  },

  recordPlay(songId: string, playedAt: number = Date.now()): void {
    const db = getDatabase();
    runInTransaction(() => {
      db.update(songs)
        .set({
          playCount: sql`${songs.playCount} + 1`,
          lastPlayedAt: playedAt,
        })
        .where(eq(songs.id, songId))
        .run();

      db.insert(playbackHistory)
        .values({
          id: generateId('hist'),
          songId,
          playedAt,
        })
        .run();
    });
  },

  clearPlaybackHistory(): void {
    const db = getDatabase();
    runInTransaction(() => {
      db.delete(playbackHistory).run();
      db.update(songs).set({ lastPlayedAt: null, playCount: 0 }).run();
    });
  },
};
