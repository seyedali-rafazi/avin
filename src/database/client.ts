import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { runMigrations } from './migrations';

const DB_NAME = 'pulse_music_player.db';

let sqliteInstance: SQLiteDatabase | null = null;
let dbInstance: ExpoSQLiteDatabase<typeof schema> | null = null;
let initialized = false;

export function getSQLite(): SQLiteDatabase {
  if (!sqliteInstance) {
    sqliteInstance = openDatabaseSync(DB_NAME);
  }
  return sqliteInstance;
}

export function getDatabase(): ExpoSQLiteDatabase<typeof schema> {
  if (!dbInstance) {
    const sqlite = getSQLite();
    if (!initialized) {
      runMigrations(sqlite);
      initialized = true;
    }
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export function initializeDatabase(): void {
  const sqlite = getSQLite();
  if (!initialized) {
    runMigrations(sqlite);
    initialized = true;
  }
  if (!dbInstance) {
    dbInstance = drizzle(sqlite, { schema });
  }
}

export function runInTransaction(fn: () => void): void {
  const sqlite = getSQLite();
  sqlite.withTransactionSync(fn);
}
