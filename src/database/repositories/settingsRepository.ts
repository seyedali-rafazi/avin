import { desc, eq } from 'drizzle-orm';
import { getDatabase, runInTransaction } from '@/database/client';
import { searchHistory, settings } from '@/database/schema';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type EqualizerPresetId,
  type PersistedPlaybackState,
} from '@/types/music';
import { generateId } from '@/utils/id';

const PLAYBACK_STATE_KEY = '__persisted_playback_state__';

const VALID_EQ_PRESETS: EqualizerPresetId[] = [
  'flat',
  'pop',
  'rock',
  'bass-boost',
  'vocal',
  'classical',
  'electronic',
  'custom',
];

function serializeSettingValue(value: unknown): string {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return String(value);
}

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

    const parseJsonArray = <T>(key: string, fallback: T[]): T[] => {
      const val = map.get(key);
      if (!val) return fallback;
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? (parsed as T[]) : fallback;
      } catch {
        return fallback;
      }
    };

    const repeat = map.get('defaultRepeatMode');
    const validRepeat =
      repeat === 'off' || repeat === 'one' || repeat === 'all'
        ? repeat
        : DEFAULT_SETTINGS.defaultRepeatMode;

    const theme = map.get('theme');
    const validTheme = theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme;

    const eqPreset = map.get('equalizerPreset') as EqualizerPresetId | undefined;
    const validEqPreset =
      eqPreset && VALID_EQ_PRESETS.includes(eqPreset)
        ? eqPreset
        : DEFAULT_SETTINGS.equalizerPreset;

    const eqBands = parseJsonArray<number>('equalizerBands', DEFAULT_SETTINGS.equalizerBands);
    const normalizedBands =
      eqBands.length === 5 && eqBands.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? eqBands
        : DEFAULT_SETTINGS.equalizerBands;

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
      crossfadeSeconds: Math.max(
        0,
        Math.min(12, parseNum('crossfadeSeconds', DEFAULT_SETTINGS.crossfadeSeconds))
      ),
      minSongDuration: Math.max(
        0,
        parseNum('minSongDuration', DEFAULT_SETTINGS.minSongDuration)
      ),
      excludedFolders: parseJsonArray<string>(
        'excludedFolders',
        DEFAULT_SETTINGS.excludedFolders
      ),
      pauseOnAudioRouteChange: parseBool(
        'pauseOnAudioRouteChange',
        DEFAULT_SETTINGS.pauseOnAudioRouteChange
      ),
      equalizerEnabled: parseBool('equalizerEnabled', DEFAULT_SETTINGS.equalizerEnabled),
      equalizerPreset: validEqPreset,
      equalizerBands: normalizedBands,
      bassBoost: parseBool('bassBoost', DEFAULT_SETTINGS.bassBoost),
    };
  },

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const db = getDatabase();
    const serialized = serializeSettingValue(value);
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
        const serialized = serializeSettingValue(value);
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

  getPersistedPlaybackState(): PersistedPlaybackState | null {
    try {
      const db = getDatabase();
      const row = db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, PLAYBACK_STATE_KEY))
        .get();
      if (!row?.value) return null;
      const parsed = JSON.parse(row.value) as PersistedPlaybackState;
      if (!Array.isArray(parsed.queueIds)) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  savePersistedPlaybackState(state: PersistedPlaybackState | null): void {
    try {
      const db = getDatabase();
      if (!state || state.queueIds.length === 0) {
        db.delete(settings).where(eq(settings.key, PLAYBACK_STATE_KEY)).run();
        return;
      }
      const serialized = JSON.stringify(state);
      db.insert(settings)
        .values({ key: PLAYBACK_STATE_KEY, value: serialized })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: serialized },
        })
        .run();
    } catch {
      // Non-fatal persistence error
    }
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
