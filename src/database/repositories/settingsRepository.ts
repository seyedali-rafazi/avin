import { desc, eq } from 'drizzle-orm';
import { getDatabase, runInTransaction } from '@/database/client';
import { searchHistory, settings } from '@/database/schema';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/music';
import { generateId } from '@/utils/id';

export const settingsRepository = {
  getAll(): AppSettings {
    const db = getDatabase();
    const rows = db.select().from(settings).all();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const parseBool = (key: string, fallback: boolean): boolean => {
      const val = map.get(key);
      if (val === undefined) return fallback;
      return val === 'true';
    };

    const parseNum = (key: string, fallback: number): number => {
      const val = map.get(key);
      if (val === undefined) return fallback;
      const parsed = Number(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const repeat = map.get('defaultRepeatMode');
    const validRepeat =
      repeat === 'off' || repeat === 'one' || repeat === 'all'
        ? repeat
        : DEFAULT_SETTINGS.defaultRepeatMode;

    const theme = map.get('theme');
    const validTheme = theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme;

    return {
      theme: validTheme,
      useSystemTheme: parseBool('useSystemTheme', DEFAULT_SETTINGS.useSystemTheme),
      accentColor: map.get('accentColor') ?? DEFAULT_SETTINGS.accentColor,
      defaultRepeatMode: validRepeat,
      shuffleByDefault: parseBool('shuffleByDefault', DEFAULT_SETTINGS.shuffleByDefault),
      defaultPlaybackSpeed: parseNum(
        'defaultPlaybackSpeed',
        DEFAULT_SETTINGS.defaultPlaybackSpeed
      ),
      gaplessPlayback: parseBool('gaplessPlayback', DEFAULT_SETTINGS.gaplessPlayback),
    };
  },

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const db = getDatabase();
    const serialized = String(value);
    db.insert(settings)
      .values({ key, value: serialized })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: serialized },
      })
      .run();
  },

  setMany(partial: Partial<AppSettings>): void {
    const db = getDatabase();
    runInTransaction(() => {
      for (const [key, value] of Object.entries(partial)) {
        if (value === undefined) continue;
        const serialized = String(value);
        db.insert(settings)
          .values({ key, value: serialized })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: serialized },
          })
          .run();
      }
    });
  },

  getSearchHistory(limit = 15): string[] {
    const db = getDatabase();
    return db
      .select({ query: searchHistory.query })
      .from(searchHistory)
      .orderBy(desc(searchHistory.searchedAt))
      .limit(limit)
      .all()
      .map((r) => r.query);
  },

  addSearchQuery(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query) return;
    const db = getDatabase();
    const now = Date.now();
    db.insert(searchHistory)
      .values({ id: generateId('sh'), query, searchedAt: now })
      .onConflictDoUpdate({
        target: searchHistory.query,
        set: { searchedAt: now },
      })
      .run();
  },

  removeSearchQuery(query: string): void {
    const db = getDatabase();
    db.delete(searchHistory).where(eq(searchHistory.query, query)).run();
  },

  clearSearchHistory(): void {
    const db = getDatabase();
    db.delete(searchHistory).run();
  },
};
