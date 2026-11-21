import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable(
  'songs',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    album: text('album').notNull(),
    albumId: text('album_id'),
    genre: text('genre').notNull().default('Unknown Genre'),
    folder: text('folder').notNull().default('Device Storage'),
    duration: real('duration').notNull().default(0),
    fileUri: text('file_uri').notNull(),
    artworkUri: text('artwork_uri'),
    fileSize: integer('file_size').notNull().default(0),
    dateAdded: integer('date_added').notNull(),
    playCount: integer('play_count').notNull().default(0),
    lastPlayedAt: integer('last_played_at'),
  },
  (table) => [
    uniqueIndex('idx_songs_file_uri').on(table.fileUri),
    index('idx_songs_title').on(table.title),
    index('idx_songs_artist').on(table.artist),
    index('idx_songs_album').on(table.album),
    index('idx_songs_genre').on(table.genre),
    index('idx_songs_folder').on(table.folder),
    index('idx_songs_date_added').on(table.dateAdded),
    index('idx_songs_last_played').on(table.lastPlayedAt),
  ]
);

export const albums = sqliteTable(
  'albums',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    artworkUri: text('artwork_uri'),
    year: integer('year'),
  },
  (table) => [index('idx_albums_title').on(table.title)]
);

export const artists = sqliteTable(
  'artists',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    artworkUri: text('artwork_uri'),
  },
  (table) => [uniqueIndex('idx_artists_name').on(table.name)]
);

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  artworkUri: text('artwork_uri'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const playlistSongs = sqliteTable(
  'playlist_songs',
  {
    id: text('id').primaryKey(),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('idx_playlist_songs_playlist').on(table.playlistId, table.position),
    uniqueIndex('idx_playlist_songs_unique').on(table.playlistId, table.songId),
  ]
);

export const favorites = sqliteTable(
  'favorites',
  {
    id: text('id').primaryKey(),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_favorites_song_id').on(table.songId)]
);

export const playbackHistory = sqliteTable(
  'playback_history',
  {
    id: text('id').primaryKey(),
    songId: text('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    playedAt: integer('played_at').notNull(),
  },
  (table) => [index('idx_playback_history_played_at').on(table.playedAt)]
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const searchHistory = sqliteTable(
  'search_history',
  {
    id: text('id').primaryKey(),
    query: text('query').notNull(),
    searchedAt: integer('searched_at').notNull(),
  },
  (table) => [uniqueIndex('idx_search_history_query').on(table.query)]
);
