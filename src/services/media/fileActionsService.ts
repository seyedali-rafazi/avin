import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import { Alert, Linking, Platform, Share } from 'react-native';
import type { Song } from '@/types/music';
import { stableId } from '@/utils/id';

const CUSTOM_ARTWORK_DIR = 'custom-artwork';

function getCustomArtworkDir(): Directory {
  const dir = new Directory(Paths.document, CUSTOM_ARTWORK_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export const fileActionsService = {
  /**
   * Picks an image from the device and copies it into persistent app storage.
   */
  async pickCustomArtwork(entityKey: string): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return null;
      const asset = result.assets[0];

      if (Platform.OS === 'web') {
        return asset.uri;
      }

      const dir = getCustomArtworkDir();
      const extMatch = asset.name?.match(/\.(png|jpg|jpeg|webp)$/i);
      const ext = extMatch ? extMatch[1]!.toLowerCase() : 'jpg';
      const destFile = new File(dir, `${stableId('cov', `${entityKey}-${Date.now()}`)}.${ext}`);
      const sourceFile = new File(asset.uri);
      sourceFile.copySync(destFile);
      return destFile.uri;
    } catch {
      return null;
    }
  },

  /**
   * Attempts to permanently delete an audio file from device storage.
   * Returns `{ deletedFromStorage, message }`.
   */
  async deleteAudioFileFromDevice(song: Song): Promise<{
    deletedFromStorage: boolean;
    message?: string;
  }> {
    if (Platform.OS === 'web') {
      return {
        deletedFromStorage: false,
        message: 'حذف مستقیم فایل در نسخه وب پشتیبانی نمی‌شود؛ آهنگ از کتابخانه حذف شد.',
      };
    }

    // 1. Try direct filesystem deletion (works for app-imported files and writable file:// paths)
    try {
      const file = new File(song.fileUri);
      if (file.exists) {
        file.delete();
        return { deletedFromStorage: true };
      }
    } catch {
      // Fall through to MediaLibrary deletion for scoped storage assets
    }

    // 2. Fallback: find matching asset in MediaLibrary and request OS-confirmed deletion
    try {
      const perm = await MediaLibraryLegacy.getPermissionsAsync(false, ['audio']);
      if (perm.granted) {
        const page = await MediaLibraryLegacy.getAssetsAsync({
          mediaType: [MediaLibraryLegacy.MediaType.audio],
          first: 500,
        });
        const match = page.assets.find((a) => a.uri === song.fileUri);
        if (match) {
          const ok = await MediaLibraryLegacy.deleteAssetsAsync([match]);
          if (ok) {
            return { deletedFromStorage: true };
          }
        }
      }
    } catch {
      // Ignore permission/system denial
    }

    return {
      deletedFromStorage: false,
      message:
        'سیستم‌عامل اجازه حذف مستقیم این فایل را نداد، اما آهنگ از کتابخانه آوین حذف شد.',
    };
  },

  /**
   * Guides the user to set a song as their device ringtone.
   */
  async setAsRingtone(song: Song): Promise<void> {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'تنظیم زنگ گوشی در iOS',
        'سیستم‌عامل iOS اجازه تنظیم مستقیم آهنگ به‌عنوان زنگ گوشی را به برنامه‌ها نمی‌دهد. می‌توانید این فایل را با برنامه GarageBand به اشتراک بگذارید و از آنجا به‌عنوان Ringtone ذخیره کنید.',
        [
          { text: 'بستن', style: 'cancel' },
          {
            text: 'اشتراک‌گذاری فایل',
            onPress: () => {
              void Share.share({
                title: song.title,
                message: song.title,
                url: song.fileUri,
              });
            },
          },
        ]
      );
      return;
    }

    if (Platform.OS === 'android') {
      Alert.alert(
        'تنظیم به‌عنوان زنگ گوشی',
        `برای تنظیم «${song.title}» به‌عنوان زنگ گوشی، می‌توانید تنظیمات صدای اندروید را باز کنید و این فایل را از مسیر «${song.folder}» انتخاب کنید.`,
        [
          { text: 'انصراف', style: 'cancel' },
          {
            text: 'باز کردن تنظیمات صدا',
            onPress: () => {
              void Linking.sendIntent('android.settings.SOUND_SETTINGS').catch(() => {
                void Linking.openSettings();
              });
            },
          },
        ]
      );
      return;
    }

    Alert.alert('تنظیم زنگ گوشی', 'این قابلیت فقط روی گوشی‌های اندروید در دسترس است.');
  },
};
