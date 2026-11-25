import type { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_music_library_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        album_id TEXT,
        genre TEXT NOT NULL DEFAULT 'Unknown Genre',
        folder TEXT NOT NULL DEFAULT 'Device Storage',
        duration REAL NOT NULL DEFAULT 0,
        file_uri TEXT NOT NULL,
        artwork_uri TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        date_added INTEGER NOT NULL,
        play_count INTEGER NOT NULL DEFAULT 0,
        last_played_at INTEGER
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_file_uri ON songs(file_uri);
      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
      CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
      CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
      CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
      CREATE INDEX IF NOT EXISTS idx_songs_folder ON songs(folder);
      CREATE INDEX IF NOT EXISTS idx_songs_date_added ON songs(date_added);
      CREATE INDEX IF NOT EXISTS idx_songs_last_played ON songs(last_played_at);

      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        artwork_uri TEXT,
        year INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);

      CREATE TABLE IF NOT EXISTS artists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        artwork_uri TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        artwork_uri TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playlist_songs (
        id TEXT PRIMARY KEY NOT NULL,
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id, position);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_songs_unique ON playlist_songs(playlist_id, song_id);

      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY NOT NULL,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_song_id ON favorites(song_id);

      CREATE TABLE IF NOT EXISTS playback_history (
        id TEXT PRIMARY KEY NOT NULL,
        song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        played_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_playback_history_played_at ON playback_history(played_at);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY NOT NULL,
        query TEXT NOT NULL,
        searched_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
    `,
  },
  {
    version: 2,
    name: 'add_song_year_lyrics_and_user_edited',
    sql: `
      ALTER TABLE songs ADD COLUMN year INTEGER;
      ALTER TABLE songs ADD COLUMN lyrics TEXT;
      ALTER TABLE songs ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
    `,
  },
];

export function runMigrations(sqlite: SQLiteDatabase): void {
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  sqlite.execSync('PRAGMA journal_mode = WAL;');

  const row = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      sqlite.withTransactionSync(() => {
        sqlite.execSync(migration.sql);
        sqlite.execSync(`PRAGMA user_version = ${migration.version};`);
      });
    }
  }
}
