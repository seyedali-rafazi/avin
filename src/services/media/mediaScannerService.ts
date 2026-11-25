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

const IMPORTED_DIR_NAME = 'imported-music';

function getImportedDirectory(): Directory {
  const dir = new Directory(Paths.document, IMPORTED_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
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

export const mediaScannerService = {
  async requestAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }
    const existing = await MediaLibraryLegacy.getPermissionsAsync(false, ['audio']);
    if (existing.granted) return true;
    const requested = await MediaLibraryLegacy.requestPermissionsAsync(false, ['audio']);
    return requested.granted;
  },

  async scanDeviceLibrary(
    onProgress?: (progress: ScanProgress) => void
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
      const granted = await this.requestAudioPermission();
      if (!granted) {
        return {
          permissionGranted: false,
          scanned: 0,
          added: 0,
          updated: 0,
          removed: 0,
          error:
            'مجوز دسترسی به فایل‌های صوتی رد شد. لطفاً دسترسی حافظه را از تنظیمات گوشی فعال کنید.',
        };
      }

      const appSettings = settingsRepository.getAll();
      const minDuration = appSettings.minSongDuration;
      const excludedFolders = appSettings.excludedFolders;

      const discovered: NewSongInput[] = [];
      const validUris = new Set<string>();
      const pageSize = 500;
      let after: string | undefined;
      let hasNextPage = true;
      let totalExpected = 0;
      let filteredOut = 0;

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

        for (const asset of page.assets) {
          const localUri = asset.uri || '';
          if (!localUri || validUris.has(localUri)) {
            continue;
          }

          const filename = asset.filename || 'Untitled.mp3';
          const duration =
            typeof asset.duration === 'number' && Number.isFinite(asset.duration) && asset.duration >= 0
              ? asset.duration
              : 0;

          // Filter out short audio clips (e.g. voice notes, notification sounds)
          if (minDuration > 0 && duration > 0 && duration < minDuration) {
            filteredOut += 1;
            continue;
          }

          const preliminary = parseMetadataFromFilename(filename, localUri);

          // Filter out blacklisted folders
          if (isFolderExcluded(preliminary.folder, localUri, excludedFolders)) {
            filteredOut += 1;
            continue;
          }

          const timestamp =
            typeof asset.modificationTime === 'number' && asset.modificationTime > 0
              ? asset.modificationTime
              : typeof asset.creationTime === 'number' && asset.creationTime > 0
                ? asset.creationTime
                : Date.now();

          let fileSize = 0;
          try {
            const file = new File(localUri);
            if (file.exists && typeof file.size === 'number') {
              fileSize = file.size;
            }
          } catch {
            // File size is optional metadata
          }

          // Extract real embedded ID3 / M4A / FLAC tags & artwork
          const tags = await extractAudioTags(localUri, { extractArtwork: true });
          const parsed = parseMetadataFromFilename(filename, localUri, {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            genre: tags.genre,
          });
          const albumId = stableId('alb', parsed.album);

          discovered.push({
            id: stableId('song', localUri),
            title: parsed.title,
            artist: parsed.artist,
            album: parsed.album,
            albumId,
            genre: parsed.genre,
            folder: parsed.folder,
            duration,
            fileUri: localUri,
            artworkUri: tags.artworkUri ?? null,
            fileSize,
            dateAdded: timestamp,
            year: tags.year ?? null,
            lyrics: tags.lyrics ?? null,
          });
          validUris.add(localUri);
        }

        onProgress?.({
          scanned: discovered.length,
          total: Math.max(totalExpected, discovered.length),
          phase: 'scanning',
        });

        if (!page.hasNextPage || !page.endCursor || page.endCursor === after) {
          hasNextPage = false;
        } else {
          after = page.endCursor;
        }
      }

      // Also include any locally imported files stored in app documents
      const importedSongs = await this.scanImportedDirectory();
      for (const song of importedSongs) {
        if (!validUris.has(song.fileUri)) {
          discovered.push(song);
          validUris.add(song.fileUri);
        }
      }

      onProgress?.({ scanned: discovered.length, total: discovered.length, phase: 'saving' });

      const { added, updated } = songRepository.upsertBatch(discovered);
      const removed = songRepository.pruneMissingUris(validUris);

      onProgress?.({ scanned: discovered.length, total: discovered.length, phase: 'done' });

      return {
        permissionGranted: true,
        scanned: discovered.length,
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

  async scanImportedDirectory(): Promise<NewSongInput[]> {
    if (Platform.OS === 'web') return [];
    try {
      const dir = getImportedDirectory();
      const entries = dir.list();
      const results: NewSongInput[] = [];

      for (const entry of entries) {
        if (entry instanceof File && isSupportedAudioFile(entry.name)) {
          const tags = await extractAudioTags(entry.uri, { extractArtwork: true });
          const parsed = parseMetadataFromFilename(entry.name, entry.uri, {
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
            genre: tags.genre,
          });
          results.push({
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
            fileSize: typeof entry.size === 'number' ? entry.size : 0,
            dateAdded: Date.now(),
            year: tags.year ?? null,
            lyrics: tags.lyrics ?? null,
          });
        }
      }
      return results;
    } catch {
      return [];
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

      const items: NewSongInput[] = [];
      const importDir = Platform.OS === 'web' ? null : getImportedDirectory();

      for (const asset of result.assets) {
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
        items.push({
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
          fileSize: asset.size ?? 0,
          dateAdded: Date.now(),
          year: tags.year ?? null,
          lyrics: tags.lyrics ?? null,
        });
      }

      const { added } = songRepository.upsertBatch(items);
      return { added };
    } catch (err) {
      return {
        added: 0,
        error: err instanceof Error ? err.message : 'امکان وارد کردن فایل‌های صوتی وجود نداشت.',
      };
    }
  },
};
