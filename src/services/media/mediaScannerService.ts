import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import {
  settingsRepository,
  songRepository,
  type NewSongInput,
} from '@/database/repositories';
import {
  isSupportedAudioFile,
  parseMetadataFromFilename,
} from '@/services/metadata/audioMetadataParser';
import { extractAudioTags } from '@/services/metadata/binaryTagReader';
import type { Song } from '@/types/music';
import { stableId } from '@/utils/id';

export interface ScanProgress {
  scanned: number;
  total: number;
  phase: 'requesting-permission' | 'scanning' | 'saving' | 'done';
}

export interface ScanResult {
  permissionGranted: boolean;
  requiresDevBuild?: boolean;
  scanned: number;
  added: number;
  updated: number;
  removed: number;
  filteredOut?: number;
  error?: string;
}

export interface ScanOptions {
  /** Check permission silently without showing an OS permission prompt. */
  skipPermissionPrompt?: boolean;
}

const IMPORTED_DIR_NAME = 'imported-music';
const SCAN_CONCURRENCY = 6;

let lastSyncedFingerprint: string | null = null;

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx]!, idx);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function getImportedDirectory(): Directory {
  const dir = new Directory(Paths.document, IMPORTED_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getImportedAudioFiles(): File[] {
  if (Platform.OS === 'web') return [];
  try {
    const dir = getImportedDirectory();
    return dir
      .list()
      .filter((entry): entry is File => entry instanceof File && isSupportedAudioFile(entry.name));
  } catch {
    return [];
  }
}

function isFolderExcluded(folderPath: string, fileUri: string, excludedFolders: string[]): boolean {
  if (excludedFolders.length === 0) return false;
  const normalizedFolder = folderPath.toLowerCase();
  const normalizedUri = decodeURIComponent(fileUri).toLowerCase();

  return excludedFolders.some((pattern) => {
    const clean = pattern.trim().toLowerCase();
    if (!clean) return false;
    return normalizedFolder.includes(clean) || normalizedUri.includes(`/${clean}/`);
  });
}

function resolveAssetTimestamp(asset: MediaLibraryLegacy.Asset): number {
  if (typeof asset.modificationTime === 'number' && asset.modificationTime > 0) {
    return asset.modificationTime;
  }
  if (typeof asset.creationTime === 'number' && asset.creationTime > 0) {
    return asset.creationTime;
  }
  return Date.now();
}

export const mediaScannerService = {
  invalidateAutoSyncCache(): void {
    lastSyncedFingerprint = null;
  },

  async hasAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const existing = await MediaLibraryLegacy.getPermissionsAsync(false, ['audio']);
      return existing.granted;
    } catch {
      return false;
    }
  },

  async requestAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }
    const existing = await MediaLibraryLegacy.getPermissionsAsync(false, ['audio']);
    if (existing.granted) return true;
    const requested = await MediaLibraryLegacy.requestPermissionsAsync(false, ['audio']);
    return requested.granted;
  },

  /**
   * Lightweight (~4ms) MediaStore head probe that detects newly added, modified, or deleted audio
   * files without re-scanning unchanged files. Automatically runs a delta sync only when needed.
   */
  async checkAndSyncChanges(): Promise<ScanResult | null> {
    if (Platform.OS === 'web') return null;

    try {
      const granted = await this.hasAudioPermission();
      if (!granted) return null;

      const appSettings = settingsRepository.getAll();
      const minDuration = appSettings.minSongDuration;
      const excludedFolders = appSettings.excludedFolders;

      const head = await MediaLibraryLegacy.getAssetsAsync({
        mediaType: [MediaLibraryLegacy.MediaType.audio],
        first: 30,
        sortBy: [[MediaLibraryLegacy.SortBy.modificationTime, false]],
      });

      const importedFiles = getImportedAudioFiles();
      const existingSongs = songRepository.getAll();
      const existingByUri = new Map<string, Song>();
      for (const s of existingSongs) {
        existingByUri.set(s.fileUri, s);
      }

      const newest = head.assets?.[0];
      const newestMod = newest ? resolveAssetTimestamp(newest) : 0;
      const fingerprint = [
        head.totalCount ?? 0,
        newest?.uri ?? '',
        newestMod,
        importedFiles.length,
        existingSongs.length,
        minDuration,
        excludedFolders.join('|'),
      ].join('::');

      let hasUnindexedChange = false;
      for (const asset of head.assets ?? []) {
        const uri = asset.uri || '';
        if (!uri) continue;
        const duration =
          typeof asset.duration === 'number' && Number.isFinite(asset.duration) && asset.duration >= 0
            ? asset.duration
            : 0;
        if (minDuration > 0 && duration > 0 && duration < minDuration) continue;
        const preliminary = parseMetadataFromFilename(asset.filename || 'Untitled.mp3', uri);
        if (isFolderExcluded(preliminary.folder, uri, excludedFolders)) continue;

        const existing = existingByUri.get(uri);
        const ts = resolveAssetTimestamp(asset);
        if (!existing || Math.abs(existing.dateAdded - ts) >= 2000) {
          hasUnindexedChange = true;
          break;
        }
      }

      if (!hasUnindexedChange) {
        for (const file of importedFiles) {
          if (!existingByUri.has(file.uri)) {
            hasUnindexedChange = true;
            break;
          }
        }
      }

      const totalKnownOnDevice = (head.totalCount ?? 0) + importedFiles.length;
      const hasCountMismatchOnColdStart =
        lastSyncedFingerprint === null &&
        (totalKnownOnDevice < existingSongs.length ||
          (minDuration === 0 &&
            excludedFolders.length === 0 &&
            totalKnownOnDevice !== existingSongs.length));

      if (lastSyncedFingerprint === null && !hasUnindexedChange && !hasCountMismatchOnColdStart) {
        lastSyncedFingerprint = fingerprint;
        return null;
      }

      if (fingerprint === lastSyncedFingerprint && !hasUnindexedChange) {
        return null;
      }

      const result = await this.scanDeviceLibrary(undefined, { skipPermissionPrompt: true });
      if (!result.error) {
        const updatedCount = songRepository.getAll().length;
        lastSyncedFingerprint = [
          head.totalCount ?? 0,
          newest?.uri ?? '',
          newestMod,
          importedFiles.length,
          updatedCount,
          minDuration,
          excludedFolders.join('|'),
        ].join('::');
      }
      return result;
    } catch {
      return null;
    }
  },

  /**
   * Subscribes to native MediaLibrary change events on iOS only.
   * On Android, expo-media-library's OnStartObserving registers ContentObservers exclusively
   * for Images and Videos (not Audio) and queries MediaStore.Files without image/video permissions
   * on the main looper, which can crash apps that only request granular audio permission.
   */
  subscribeToMediaChanges(onChanged: () => void): () => void {
    if (Platform.OS !== 'ios') {
      return () => undefined;
    }
    try {
      const sub = MediaLibraryLegacy.addListener(() => {
        onChanged();
      });
      return () => {
        try {
          sub.remove();
        } catch {
          // Ignore cleanup errors
        }
      };
    } catch {
      return () => undefined;
    }
  },

  async scanDeviceLibrary(
    onProgress?: (progress: ScanProgress) => void,
    options?: ScanOptions
  ): Promise<ScanResult> {
    onProgress?.({ scanned: 0, total: 0, phase: 'requesting-permission' });

    if (Platform.OS === 'web') {
      return {
        permissionGranted: false,
        scanned: 0,
        added: 0,
        updated: 0,
        removed: 0,
        error:
          'اسکن خودکار حافظه فقط در اندروید و iOS در دسترس است. برای افزودن موسیقی از گزینه «افزودن فایل» استفاده کنید.',
      };
    }

    try {
      const granted = options?.skipPermissionPrompt
        ? await this.hasAudioPermission()
        : await this.requestAudioPermission();

      if (!granted) {
        return {
          permissionGranted: false,
          scanned: 0,
          added: 0,
          updated: 0,
          removed: 0,
          error: options?.skipPermissionPrompt
            ? undefined
            : 'مجوز دسترسی به فایل‌های صوتی رد شد. لطفاً دسترسی حافظه را از تنظیمات گوشی فعال کنید.',
        };
      }

      const appSettings = settingsRepository.getAll();
      const minDuration = appSettings.minSongDuration;
      const excludedFolders = appSettings.excludedFolders;

      // Index existing songs by URI for instant incremental/delta scans
      const existingByUri = new Map<string, Song>();
      for (const existing of songRepository.getAll()) {
        existingByUri.set(existing.fileUri, existing);
      }

      const toUpsert: NewSongInput[] = [];
      const validUris = new Set<string>();
      const pageSize = 1000;
      let after: string | undefined;
      let hasNextPage = true;
      let totalExpected = 0;
      let filteredOut = 0;
      let processedCount = 0;
      let lastProgressEmit = 0;

      const emitProgress = (force = false) => {
        const now = Date.now();
        if (force || now - lastProgressEmit >= 120) {
          lastProgressEmit = now;
          onProgress?.({
            scanned: processedCount,
            total: Math.max(totalExpected, processedCount),
            phase: 'scanning',
          });
        }
      };

      while (hasNextPage) {
        const page = await MediaLibraryLegacy.getAssetsAsync({
          mediaType: [MediaLibraryLegacy.MediaType.audio],
          first: pageSize,
          after,
          sortBy: [[MediaLibraryLegacy.SortBy.modificationTime, false]],
        });

        if (totalExpected === 0 && typeof page.totalCount === 'number') {
          totalExpected = page.totalCount;
        }

        if (!page.assets || page.assets.length === 0) {
          break;
        }

        interface PendingAsset {
          localUri: string;
          filename: string;
          duration: number;
          timestamp: number;
        }

        const toExtract: PendingAsset[] = [];

        for (const asset of page.assets) {
          const localUri = asset.uri || '';
          if (!localUri || validUris.has(localUri)) {
            continue;
          }

          const filename = asset.filename || 'Untitled.mp3';
          const duration =
            typeof asset.duration === 'number' &&
            Number.isFinite(asset.duration) &&
            asset.duration >= 0
              ? asset.duration
              : 0;

          if (minDuration > 0 && duration > 0 && duration < minDuration) {
            filteredOut += 1;
            continue;
          }

          const preliminary = parseMetadataFromFilename(filename, localUri);

          if (isFolderExcluded(preliminary.folder, localUri, excludedFolders)) {
            filteredOut += 1;
            continue;
          }

          const timestamp = resolveAssetTimestamp(asset);
          validUris.add(localUri);

          // Fast path: unchanged song already in DB — skip binary tag parsing AND skip SQLite write
          const existing = existingByUri.get(localUri);
          if (existing && Math.abs(existing.dateAdded - timestamp) < 2000) {
            processedCount += 1;
            continue;
          }

          toExtract.push({ localUri, filename, duration, timestamp });
        }

        emitProgress();

        // Extract embedded tags & artwork in parallel (16 concurrent workers) only for new/changed files
        if (toExtract.length > 0) {
          const extractedItems = await runWithConcurrency(
            toExtract,
            SCAN_CONCURRENCY,
            async (item): Promise<NewSongInput> => {
              const tags = await extractAudioTags(item.localUri, { extractArtwork: true });
              const parsed = parseMetadataFromFilename(item.filename, item.localUri, {
                title: tags.title,
                artist: tags.artist,
                album: tags.album,
                genre: tags.genre,
              });

              processedCount += 1;
              if (processedCount % 16 === 0) {
                emitProgress();
              }

              return {
                id: stableId('song', item.localUri),
                title: parsed.title,
                artist: parsed.artist,
                album: parsed.album,
                albumId: stableId('alb', parsed.album),
                genre: parsed.genre,
                folder: parsed.folder,
                duration: item.duration,
                fileUri: item.localUri,
                artworkUri: tags.artworkUri ?? null,
                fileSize: tags.fileSize ?? 0,
                dateAdded: item.timestamp,
                year: tags.year ?? null,
                lyrics: tags.lyrics ?? null,
              };
            }
          );

          for (const song of extractedItems) {
            toUpsert.push(song);
          }
        }

        emitProgress(true);

        if (!page.hasNextPage || !page.endCursor || page.endCursor === after) {
          hasNextPage = false;
        } else {
          after = page.endCursor;
        }
      }

      // Include locally imported files stored in app documents
      const importedResult = await this.scanImportedDirectory(existingByUri);
      for (const uri of importedResult.allUris) {
        validUris.add(uri);
      }
      for (const song of importedResult.newSongs) {
        if (!existingByUri.has(song.fileUri)) {
          toUpsert.push(song);
        }
      }

      const totalDiscovered = validUris.size;
      onProgress?.({ scanned: totalDiscovered, total: totalDiscovered, phase: 'saving' });

      const { added, updated } = songRepository.upsertBatch(toUpsert);
      const removed = songRepository.pruneMissingUris(validUris);

      onProgress?.({ scanned: totalDiscovered, total: totalDiscovered, phase: 'done' });
      this.invalidateAutoSyncCache();

      return {
        permissionGranted: true,
        scanned: totalDiscovered,
        added,
        updated,
        removed,
        filteredOut,
      };
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : 'خطا در اسکن کتابخانه صوتی دستگاه.';
      const isMissingManifestPermission =
        rawMessage.includes('not declared in AndroidManifest') ||
        rawMessage.includes('AUDIO permission');

      if (isMissingManifestPermission) {
        return {
          permissionGranted: false,
          requiresDevBuild: true,
          scanned: 0,
          added: 0,
          updated: 0,
          removed: 0,
          error:
            'اسکن خودکار کل دستگاه نیازمند نسخه نصبی (Development Build) است. در حال حاضر می‌توانید از گزینه «افزودن فایل» برای وارد کردن موسیقی استفاده کنید.',
        };
      }

      return {
        permissionGranted: true,
        scanned: 0,
        added: 0,
        updated: 0,
        removed: 0,
        error: rawMessage,
      };
    }
  },

  async scanImportedDirectory(
    existingByUri?: Map<string, Song>
  ): Promise<{ allUris: string[]; newSongs: NewSongInput[] }> {
    const entries = getImportedAudioFiles();
    if (entries.length === 0) {
      return { allUris: [], newSongs: [] };
    }

    const allUris = entries.map((e) => e.uri);
    const unindexed = entries.filter((e) => !existingByUri?.has(e.uri));
    if (unindexed.length === 0) {
      return { allUris, newSongs: [] };
    }

    try {
      const newSongs = await runWithConcurrency(
        unindexed,
        SCAN_CONCURRENCY,
        async (entry): Promise<NewSongInput> => {
          const tags = await extractAudioTags(entry.uri, { extractArtwork: true });
          const parsed = parseMetadataFromFilename(entry.name, entry.uri, {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            genre: tags.genre,
          });
          return {
            id: stableId('song', entry.uri),
            title: parsed.title,
            artist: parsed.artist,
            album: parsed.album,
            albumId: stableId('alb', parsed.album),
            genre: parsed.genre,
            folder: 'واردشده',
            duration: 0,
            fileUri: entry.uri,
            artworkUri: tags.artworkUri ?? null,
            fileSize: tags.fileSize ?? (typeof entry.size === 'number' ? entry.size : 0),
            dateAdded: Date.now(),
            year: tags.year ?? null,
            lyrics: tags.lyrics ?? null,
          };
        }
      );
      return { allUris, newSongs };
    } catch {
      return { allUris, newSongs: [] };
    }
  },

  async importAudioFiles(): Promise<{ added: number; error?: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { added: 0 };
      }

      const importDir = Platform.OS === 'web' ? null : getImportedDirectory();

      const items = await runWithConcurrency(
        result.assets,
        SCAN_CONCURRENCY,
        async (asset): Promise<NewSongInput> => {
          let targetUri = asset.uri;
          if (importDir && Platform.OS !== 'web') {
            try {
              const safeName = asset.name.replace(/[^a-zA-Z0-9._\-\s\u0600-\u06FF]/g, '_');
              const sourceFile = new File(asset.uri);
              const destFile = new File(importDir, safeName);
              if (!destFile.exists) {
                sourceFile.copySync(destFile);
              }
              targetUri = destFile.uri;
            } catch {
              // Keep picker URI if copying fails
            }
          }

          const tags = await extractAudioTags(targetUri, { extractArtwork: true });
          const parsed = parseMetadataFromFilename(asset.name, targetUri, {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            genre: tags.genre,
          });
          return {
            id: stableId('song', targetUri),
            title: parsed.title,
            artist: parsed.artist,
            album: parsed.album,
            albumId: stableId('alb', parsed.album),
            genre: parsed.genre,
            folder: 'واردشده',
            duration: 0,
            fileUri: targetUri,
            artworkUri: tags.artworkUri ?? null,
            fileSize: tags.fileSize ?? asset.size ?? 0,
            dateAdded: Date.now(),
            year: tags.year ?? null,
            lyrics: tags.lyrics ?? null,
          };
        }
      );

      const { added } = songRepository.upsertBatch(items);
      this.invalidateAutoSyncCache();
      return { added };
    } catch (err) {
      return {
        added: 0,
        error: err instanceof Error ? err.message : 'امکان وارد کردن فایل‌های صوتی وجود نداشت.',
      };
    }
  },
};
