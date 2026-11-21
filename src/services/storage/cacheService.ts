import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Platform } from 'react-native';

function getDirectorySize(dir: Directory): number {
  if (!dir.exists) return 0;
  let total = 0;
  try {
    for (const entry of dir.list()) {
      if (entry instanceof File) {
        total += typeof entry.size === 'number' ? entry.size : 0;
      } else if (entry instanceof Directory) {
        total += getDirectorySize(entry);
      }
    }
  } catch {
    return total;
  }
  return total;
}

export const cacheService = {
  async getCacheSizeBytes(): Promise<number> {
    if (Platform.OS === 'web') return 0;
    try {
      const cacheDir = new Directory(Paths.cache);
      return getDirectorySize(cacheDir);
    } catch {
      return 0;
    }
  },

  async clearCache(): Promise<void> {
    try {
      await Image.clearDiskCache();
      await Image.clearMemoryCache();
    } catch {
      // Ignore image cache clear errors
    }

    if (Platform.OS === 'web') return;

    try {
      const cacheDir = new Directory(Paths.cache);
      if (cacheDir.exists) {
        for (const entry of cacheDir.list()) {
          try {
            entry.delete();
          } catch {
            // Skip locked system cache entries
          }
        }
      }
    } catch {
      // Ignore non-fatal cache errors
    }
  },
};
