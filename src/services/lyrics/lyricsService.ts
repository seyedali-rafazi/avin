import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { extractAudioTags } from '@/services/metadata/binaryTagReader';
import type { Song } from '@/types/music';

const IS_WEB = typeof document !== 'undefined';

export interface LyricLine {
  time: number | null; // seconds, or null if unsynced
  text: string;
}

export interface ParsedLyrics {
  isSynced: boolean;
  lines: LyricLine[];
  raw: string;
}

const LRC_TIME_REGEX = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parses either synced `.lrc` text or plain unsynced lyrics into structured lines.
 */
export function parseLyrics(raw: string): ParsedLyrics {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return { isSynced: false, lines: [], raw: '' };
  }

  const rawLines = normalized.split('\n');
  const syncedLines: LyricLine[] = [];

  for (const line of rawLines) {
    const matches = Array.from(line.matchAll(LRC_TIME_REGEX));
    if (matches.length === 0) continue;

    const text = line.replace(LRC_TIME_REGEX, '').trim();
    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fracRaw = match[3] ?? '0';
      const frac =
        fracRaw.length === 3
          ? Number(fracRaw) / 1000
          : fracRaw.length === 2
            ? Number(fracRaw) / 100
            : Number(fracRaw) / 10;
      const time = minutes * 60 + seconds + frac;
      if (Number.isFinite(time)) {
        syncedLines.push({ time, text });
      }
    }
  }

  if (syncedLines.length > 0) {
    syncedLines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    return {
      isSynced: true,
      lines: syncedLines,
      raw: normalized,
    };
  }

  const plainLines: LyricLine[] = rawLines.map((line) => ({
    time: null,
    text: line.trim(),
  }));

  return {
    isSynced: false,
    lines: plainLines,
    raw: normalized,
  };
}

/**
 * Finds the active line index for synced lyrics at a given playback position (seconds).
 */
export function getActiveLyricIndex(lines: LyricLine[], positionSeconds: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]?.time;
    if (t !== null && t !== undefined && t <= positionSeconds + 0.15) {
      active = i;
    } else if (t !== null && t !== undefined && t > positionSeconds + 0.15) {
      break;
    }
  }
  return active;
}

function getSiblingLrcUri(audioUri: string): string | null {
  const lastDot = audioUri.lastIndexOf('.');
  if (lastDot <= 0) return null;
  return `${audioUri.slice(0, lastDot)}.lrc`;
}

export const lyricsService = {
  async loadLyricsForSong(song: Song): Promise<ParsedLyrics | null> {
    // 1. Check lyrics stored in SQLite (user-edited or previously extracted)
    if (song.lyrics && song.lyrics.trim().length > 0) {
      return parseLyrics(song.lyrics);
    }

    if (IS_WEB) return null;

    // 2. Check sibling `.lrc` file next to the audio file
    try {
      const lrcUri = getSiblingLrcUri(song.fileUri);
      if (lrcUri) {
        const lrcFile = new File(lrcUri);
        if (lrcFile.exists) {
          const text = await lrcFile.text();
          if (text.trim().length > 0) {
            return parseLyrics(text);
          }
        }
      }
    } catch {
      // Sibling file may not exist or lack read access
    }

    // 3. Extract embedded lyrics on demand from ID3 USLT/SYLT, MP4 ©lyr, or FLAC LYRICS
    try {
      const tags = await extractAudioTags(song.fileUri, { extractArtwork: false });
      if (tags.lyrics && tags.lyrics.trim().length > 0) {
        return parseLyrics(tags.lyrics);
      }
    } catch {
      // Ignore extraction failure
    }

    return null;
  },

  async pickLrcFile(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/octet-stream', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return null;
      const file = new File(result.assets[0].uri);
      const content = await file.text();
      return content.trim() || null;
    } catch {
      return null;
    }
  },
};
