import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { songRepository, type NewSongInput } from '@/database/repositories';
import {
  isSupportedAudioFile,
  parseMetadataFromFilename,
} from '@/services/metadata/audioMetadataParser';
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
        error: 'Automatic device scanning requires Android or iOS. Use Import Files to add audio.',
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
          error: 'Audio library permission was denied. Enable storage access in device settings.',
        };
      }

      const discovered: NewSongInput[] = [];
      const validUris = new Set<string>();
      const pageSize = 500;
      let after: string | undefined;
      let hasNextPage = true;
      let totalExpected = 0;

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

          const parsed = parseMetadataFromFilename(filename, localUri);
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
            artworkUri: null,
            fileSize,
            dateAdded: timestamp,
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
      const importedSongs = this.scanImportedDirectory();
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
      };
    } catch (err) {
      const rawMessage =
        err instanceof Error ? err.message : 'Failed to scan device audio library.';
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
            'Automatic full-device scanning requires an Expo Development Build (Expo Go on Android does not include the READ_MEDIA_AUDIO permission). Use "Import Files" to add local music right now.',
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

  scanImportedDirectory(): NewSongInput[] {
    if (Platform.OS === 'web') return [];
    try {
      const dir = getImportedDirectory();
      const entries = dir.list();
      const results: NewSongInput[] = [];

      for (const entry of entries) {
        if (entry instanceof File && isSupportedAudioFile(entry.name)) {
          const parsed = parseMetadataFromFilename(entry.name, entry.uri);
          results.push({
            id: stableId('song', entry.uri),
            title: parsed.title,
            artist: parsed.artist,
            album: parsed.album,
            albumId: stableId('alb', parsed.album),
            genre: parsed.genre,
            folder: 'Imported',
            duration: 0,
            fileUri: entry.uri,
            artworkUri: null,
            fileSize: typeof entry.size === 'number' ? entry.size : 0,
            dateAdded: Date.now(),
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
            const safeName = asset.name.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
            const sourceFile = new File(asset.uri);
            const destFile = new File(importDir, safeName);
            if (!destFile.exists) {
              sourceFile.copy(destFile);
            }
            targetUri = destFile.uri;
          } catch {
            // Keep picker URI if copying fails
          }
        }

        const parsed = parseMetadataFromFilename(asset.name, targetUri);
        items.push({
          id: stableId('song', targetUri),
          title: parsed.title,
          artist: parsed.artist,
          album: parsed.album,
          albumId: stableId('alb', parsed.album),
          genre: parsed.genre,
          folder: 'Imported',
          duration: 0,
          fileUri: targetUri,
          artworkUri: null,
          fileSize: asset.size ?? 0,
          dateAdded: Date.now(),
        });
      }

      const { added } = songRepository.upsertBatch(items);
      return { added };
    } catch (err) {
      return {
        added: 0,
        error: err instanceof Error ? err.message : 'Unable to import audio files.',
      };
    }
  },
};
