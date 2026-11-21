import { SUPPORTED_AUDIO_EXTENSIONS } from '@/constants/audio';

export interface ParsedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  folder: string;
}

export function isSupportedAudioFile(filenameOrUri: string): boolean {
  const lower = filenameOrUri.toLowerCase().split('?')[0] ?? '';
  return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function stripAudioExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename.trim();
  return filename.slice(0, lastDot).trim();
}

export function extractFolderFromUri(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const cleaned = decoded.replace(/^file:\/\//i, '').replace(/\\/g, '/');
    const lastSlash = cleaned.lastIndexOf('/');
    if (lastSlash <= 0) return 'Device Storage';
    const dir = cleaned.slice(0, lastSlash);
    const parts = dir.split('/').filter(Boolean);
    if (parts.length === 0) return 'Device Storage';
    // Return up to the last two meaningful folder segments (e.g. "Music/Favorites")
    const tail = parts.slice(-2).join('/');
    return tail || 'Device Storage';
  } catch {
    return 'Device Storage';
  }
}

export function parseMetadataFromFilename(
  filename: string,
  uri: string,
  overrides?: {
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    genre?: string | null;
  }
): ParsedAudioMetadata {
  const base = stripAudioExtension(filename)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading track numbers like "01 - ", "01. ", "1) "
  const withoutTrackNum = base.replace(/^\d{1,3}[\s._)\-]+/, '').trim() || base;

  let parsedArtist = 'Unknown Artist';
  let parsedTitle = withoutTrackNum || 'Untitled Track';

  const separatorMatch = withoutTrackNum.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (separatorMatch && separatorMatch[1] && separatorMatch[2]) {
    parsedArtist = separatorMatch[1].trim();
    parsedTitle = separatorMatch[2].trim();
  }

  const folder = extractFolderFromUri(uri);
  const folderParts = folder.split('/').filter(Boolean);
  const inferredAlbum =
    folderParts.length > 0 &&
    !['music', 'download', 'downloads', 'audio', 'device storage', 'imported'].includes(
      folderParts[folderParts.length - 1]!.toLowerCase()
    )
      ? folderParts[folderParts.length - 1]!
      : 'Unknown Album';

  return {
    title: overrides?.title?.trim() || parsedTitle,
    artist: overrides?.artist?.trim() || parsedArtist,
    album: overrides?.album?.trim() || inferredAlbum,
    genre: overrides?.genre?.trim() || 'Unknown Genre',
    folder,
  };
}
