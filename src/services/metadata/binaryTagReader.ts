import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { stableId } from '@/utils/id';

const IS_WEB = typeof document !== 'undefined';

export interface BinaryAudioTags {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number | null;
  lyrics?: string;
  artworkBytes?: Uint8Array;
  artworkMime?: string;
}

export interface ExtractedAudioTags {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number | null;
  lyrics?: string;
  artworkUri?: string | null;
  fileSize?: number;
}

const ID3V1_GENRES: readonly string[] = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge',
  'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B',
  'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska',
  'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop',
  'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid',
  'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'AlternRock', 'Bass',
  'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock',
  'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk',
  'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta', 'Top 40',
  'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave',
  'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk',
  'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock', 'Folk',
  'Folk-Rock', 'National Folk', 'Swing', 'Fast Fusion', 'Bebop', 'Latin',
  'Revival', 'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock',
  'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock',
  'Big Band', 'Chorus', 'Easy Listening', 'Acoustic', 'Humour', 'Speech',
  'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass',
  'Primus', 'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba',
  'Folklore', 'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet',
  'Punk Rock', 'Drum Solo', 'A capella', 'Euro-House', 'Dance Hall',
];

function readUInt16BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] ?? 0) << 8) | (buf[offset + 1] ?? 0);
}

function readUInt24BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] ?? 0) << 16) | ((buf[offset + 1] ?? 0) << 8) | (buf[offset + 2] ?? 0);
}

function readUInt32BE(buf: Uint8Array, offset: number): number {
  return (
    (((buf[offset] ?? 0) << 24) >>> 0) +
    ((buf[offset + 1] ?? 0) << 16) +
    ((buf[offset + 2] ?? 0) << 8) +
    (buf[offset + 3] ?? 0)
  );
}

function readUInt32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] ?? 0) +
    ((buf[offset + 1] ?? 0) << 8) +
    ((buf[offset + 2] ?? 0) << 16) +
    (((buf[offset + 3] ?? 0) << 24) >>> 0)
  );
}

function readSynchsafeInt(buf: Uint8Array, offset: number): number {
  return (
    (((buf[offset] ?? 0) & 0x7f) << 21) |
    (((buf[offset + 1] ?? 0) & 0x7f) << 14) |
    (((buf[offset + 2] ?? 0) & 0x7f) << 7) |
    ((buf[offset + 3] ?? 0) & 0x7f)
  );
}

function decodeAscii(buf: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end && i < buf.length; i++) {
    const code = buf[i]!;
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      // Fallback below
    }
  }
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++]!;
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if ((c & 0xe0) === 0xc0 && i < bytes.length) {
      out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++]! & 0x3f));
    } else if ((c & 0xf0) === 0xe0 && i + 1 < bytes.length) {
      out += String.fromCharCode(
        ((c & 0x0f) << 12) | ((bytes[i++]! & 0x3f) << 6) | (bytes[i++]! & 0x3f)
      );
    } else if ((c & 0xf8) === 0xf0 && i + 2 < bytes.length) {
      const cp =
        ((c & 0x07) << 18) |
        ((bytes[i++]! & 0x3f) << 12) |
        ((bytes[i++]! & 0x3f) << 6) |
        (bytes[i++]! & 0x3f);
      const adjusted = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
    }
  }
  return out;
}

function decodeUtf16(bytes: Uint8Array, bigEndianDefault = false): string {
  let offset = 0;
  let littleEndian = !bigEndianDefault;
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      littleEndian = true;
      offset = 2;
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      littleEndian = false;
      offset = 2;
    }
  }
  let out = '';
  for (let i = offset; i + 1 < bytes.length; i += 2) {
    const code = littleEndian
      ? (bytes[i]! | (bytes[i + 1]! << 8))
      : ((bytes[i]! << 8) | bytes[i + 1]!);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i]!;
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function decodeId3Text(encoding: number, payload: Uint8Array): string {
  let raw = '';
  if (encoding === 0) {
    raw = decodeLatin1(payload);
  } else if (encoding === 1) {
    raw = decodeUtf16(payload, false);
  } else if (encoding === 2) {
    raw = decodeUtf16(payload, true);
  } else if (encoding === 3) {
    raw = decodeUtf8(payload);
  } else {
    raw = decodeUtf8(payload);
  }
  return raw.replace(/\0+$/g, '').trim();
}

function normalizeGenre(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^\((\d+)\)(.*)$/);
  if (match) {
    const idx = Number(match[1]);
    const rest = match[2]?.trim();
    if (rest) return rest;
    if (idx >= 0 && idx < ID3V1_GENRES.length) {
      return ID3V1_GENRES[idx]!;
    }
  }
  if (/^\d+$/.test(trimmed)) {
    const idx = Number(trimmed);
    if (idx >= 0 && idx < ID3V1_GENRES.length) {
      return ID3V1_GENRES[idx]!;
    }
  }
  return trimmed;
}

function parseYear(raw: string): number | null {
  const match = raw.match(/\b(19\d{2}|20\d{2}|13\d{2}|14\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function findNullTerminator(buf: Uint8Array, start: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < buf.length; i += 2) {
      if (buf[i] === 0 && buf[i + 1] === 0) return i;
    }
    return buf.length;
  }
  for (let i = start; i < buf.length; i++) {
    if (buf[i] === 0) return i;
  }
  return buf.length;
}

function formatLrcTimestamp(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec - mins * 60;
  const mm = String(mins).padStart(2, '0');
  const ss = secs.toFixed(2).padStart(5, '0');
  return `[${mm}:${ss}]`;
}

/**
 * Pure binary parser for ID3v2 (v2.2 / v2.3 / v2.4) tags.
 */
export function parseId3v2Buffer(buf: Uint8Array): BinaryAudioTags {
  const tags: BinaryAudioTags = {};
  if (buf.length < 10) return tags;
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return tags; // "ID3"

  const versionMajor = buf[3]!;
  const flags = buf[5]!;
  const tagSize = readSynchsafeInt(buf, 6);
  const tagEnd = Math.min(buf.length, 10 + tagSize);

  let offset = 10;

  // Skip extended header if present (ID3v2.3 / v2.4)
  if ((flags & 0x40) !== 0 && offset + 4 <= tagEnd) {
    const extSize =
      versionMajor === 4 ? readSynchsafeInt(buf, offset) : readUInt32BE(buf, offset) + 4;
    offset += Math.max(4, extSize);
  }

  while (offset < tagEnd) {
    let frameId = '';
    let frameSize = 0;
    let headerSize = 0;

    if (versionMajor === 2) {
      if (offset + 6 > tagEnd) break;
      frameId = decodeAscii(buf, offset, offset + 3);
      frameSize = readUInt24BE(buf, offset + 3);
      headerSize = 6;
    } else {
      if (offset + 10 > tagEnd) break;
      frameId = decodeAscii(buf, offset, offset + 4);
      frameSize =
        versionMajor === 4 ? readSynchsafeInt(buf, offset + 4) : readUInt32BE(buf, offset + 4);
      headerSize = 10;
    }

    if (!frameId || frameId.charCodeAt(0) === 0 || frameSize <= 0) break;
    const dataStart = offset + headerSize;
    const dataEnd = Math.min(tagEnd, dataStart + frameSize);
    if (dataStart >= tagEnd) break;

    const frameData = buf.subarray(dataStart, dataEnd);

    if (frameId === 'TIT2' || frameId === 'TT2') {
      const val = decodeId3Text(frameData[0] ?? 0, frameData.subarray(1));
      if (val) tags.title = val;
    } else if (frameId === 'TPE1' || frameId === 'TP1') {
      const val = decodeId3Text(frameData[0] ?? 0, frameData.subarray(1));
      if (val) tags.artist = val;
    } else if (frameId === 'TALB' || frameId === 'TAL') {
      const val = decodeId3Text(frameData[0] ?? 0, frameData.subarray(1));
      if (val) tags.album = val;
    } else if (frameId === 'TCON' || frameId === 'TCO') {
      const val = normalizeGenre(decodeId3Text(frameData[0] ?? 0, frameData.subarray(1)));
      if (val) tags.genre = val;
    } else if (frameId === 'TYER' || frameId === 'TDRC' || frameId === 'TYE') {
      const val = parseYear(decodeId3Text(frameData[0] ?? 0, frameData.subarray(1)));
      if (val) tags.year = val;
    } else if (frameId === 'USLT' || frameId === 'ULT') {
      if (frameData.length > 4) {
        const enc = frameData[0]!;
        const descEnd = findNullTerminator(frameData, 4, enc);
        const nullLen = enc === 1 || enc === 2 ? 2 : 1;
        const lyricsBytes = frameData.subarray(Math.min(frameData.length, descEnd + nullLen));
        const val = decodeId3Text(enc, lyricsBytes);
        if (val && !tags.lyrics) tags.lyrics = val;
      }
    } else if (frameId === 'SYLT' && frameData.length > 6) {
      const enc = frameData[0]!;
      const timeFormat = frameData[4]!; // 2 = milliseconds
      if (timeFormat === 2) {
        const descEnd = findNullTerminator(frameData, 6, enc);
        const nullLen = enc === 1 || enc === 2 ? 2 : 1;
        let pos = Math.min(frameData.length, descEnd + nullLen);
        const lines: string[] = [];
        while (pos < frameData.length) {
          const textEnd = findNullTerminator(frameData, pos, enc);
          const lineText = decodeId3Text(enc, frameData.subarray(pos, textEnd));
          pos = textEnd + nullLen;
          if (pos + 4 > frameData.length) break;
          const ms = readUInt32BE(frameData, pos);
          pos += 4;
          if (lineText) {
            lines.push(`${formatLrcTimestamp(ms)} ${lineText}`);
          }
        }
        if (lines.length > 0) {
          tags.lyrics = lines.join('\n');
        }
      }
    } else if ((frameId === 'APIC' || frameId === 'PIC') && !tags.artworkBytes && frameData.length > 8) {
      const enc = frameData[0]!;
      let mime = 'image/jpeg';
      let cursor = 1;
      if (frameId === 'PIC') {
        const fmt = decodeAscii(frameData, 1, 4).toLowerCase();
        mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
        cursor = 4;
      } else {
        const mimeEnd = findNullTerminator(frameData, 1, 0);
        const rawMime = decodeAscii(frameData, 1, mimeEnd).toLowerCase();
        if (rawMime.includes('png')) mime = 'image/png';
        else if (rawMime.includes('webp')) mime = 'image/webp';
        else mime = 'image/jpeg';
        cursor = mimeEnd + 1;
      }
      // Skip picture type byte
      cursor += 1;
      const descEnd = findNullTerminator(frameData, cursor, enc);
      const nullLen = enc === 1 || enc === 2 ? 2 : 1;
      const imgStart = descEnd + nullLen;
      if (imgStart < frameData.length) {
        tags.artworkBytes = frameData.slice(imgStart);
        tags.artworkMime = mime;
      }
    }

    offset = dataEnd;
  }

  return tags;
}

/**
 * Pure binary parser for ID3v1 (last 128 bytes of MP3).
 */
export function parseId3v1Buffer(tail: Uint8Array): BinaryAudioTags {
  const tags: BinaryAudioTags = {};
  if (tail.length < 128) return tags;
  const start = tail.length - 128;
  if (tail[start] !== 0x54 || tail[start + 1] !== 0x41 || tail[start + 2] !== 0x47) {
    return tags; // "TAG"
  }

  const title = decodeLatin1(tail.subarray(start + 3, start + 33)).trim();
  const artist = decodeLatin1(tail.subarray(start + 33, start + 63)).trim();
  const album = decodeLatin1(tail.subarray(start + 63, start + 93)).trim();
  const yearStr = decodeLatin1(tail.subarray(start + 93, start + 97)).trim();
  const genreByte = tail[start + 127]!;

  if (title) tags.title = title;
  if (artist) tags.artist = artist;
  if (album) tags.album = album;
  const year = parseYear(yearStr);
  if (year) tags.year = year;
  if (genreByte < ID3V1_GENRES.length) {
    tags.genre = ID3V1_GENRES[genreByte]!;
  }
  return tags;
}

/**
 * Pure binary parser for FLAC metadata blocks (VORBIS_COMMENT + PICTURE).
 */
export function parseFlacBuffer(buf: Uint8Array): BinaryAudioTags {
  const tags: BinaryAudioTags = {};
  if (buf.length < 8) return tags;
  if (
    buf[0] !== 0x66 ||
    buf[1] !== 0x4c ||
    buf[2] !== 0x61 ||
    buf[3] !== 0x43
  ) {
    return tags; // "fLaC"
  }

  let offset = 4;
  while (offset + 4 <= buf.length) {
    const headerByte = buf[offset]!;
    const isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7f;
    const blockLen = readUInt24BE(buf, offset + 1);
    offset += 4;

    if (offset + blockLen > buf.length) break;
    const block = buf.subarray(offset, offset + blockLen);

    if (blockType === 4) {
      // VORBIS_COMMENT
      let pos = 0;
      if (pos + 4 <= block.length) {
        const vendorLen = readUInt32LE(block, pos);
        pos += 4 + vendorLen;
        if (pos + 4 <= block.length) {
          const commentCount = readUInt32LE(block, pos);
          pos += 4;
          for (let i = 0; i < commentCount && pos + 4 <= block.length; i++) {
            const len = readUInt32LE(block, pos);
            pos += 4;
            if (pos + len > block.length) break;
            const entry = decodeUtf8(block.subarray(pos, pos + len));
            pos += len;
            const eqIdx = entry.indexOf('=');
            if (eqIdx <= 0) continue;
            const key = entry.slice(0, eqIdx).toUpperCase();
            const val = entry.slice(eqIdx + 1).trim();
            if (!val) continue;
            if (key === 'TITLE') tags.title = val;
            else if (key === 'ARTIST') tags.artist = val;
            else if (key === 'ALBUM') tags.album = val;
            else if (key === 'GENRE') tags.genre = val;
            else if (key === 'DATE' || key === 'YEAR') tags.year = parseYear(val);
            else if (key === 'LYRICS' || key === 'UNSYNCEDLYRICS') tags.lyrics = val;
          }
        }
      }
    } else if (blockType === 6 && !tags.artworkBytes) {
      // PICTURE
      let pos = 4; // skip picture type
      if (pos + 4 <= block.length) {
        const mimeLen = readUInt32BE(block, pos);
        pos += 4;
        const mime = decodeAscii(block, pos, pos + mimeLen).toLowerCase() || 'image/jpeg';
        pos += mimeLen;
        if (pos + 4 <= block.length) {
          const descLen = readUInt32BE(block, pos);
          pos += 4 + descLen + 16; // skip width, height, depth, colors (4*4)
          if (pos + 4 <= block.length) {
            const dataLen = readUInt32BE(block, pos);
            pos += 4;
            if (dataLen > 0 && pos + dataLen <= block.length) {
              tags.artworkBytes = block.slice(pos, pos + dataLen);
              tags.artworkMime = mime.includes('png') ? 'image/png' : 'image/jpeg';
            }
          }
        }
      }
    }

    offset += blockLen;
    if (isLast) break;
  }

  return tags;
}

/**
 * Pure binary parser for MP4 / M4A / AAC atoms (moov -> udta -> meta -> ilst).
 */
export function parseMp4Buffer(buf: Uint8Array): BinaryAudioTags {
  const tags: BinaryAudioTags = {};
  if (buf.length < 12) return tags;

  const parseAtoms = (start: number, end: number, insideIlst = false) => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = readUInt32BE(buf, offset);
      const type = decodeAscii(buf, offset + 4, offset + 8);
      let headerLen = 8;

      if (size === 0) {
        size = end - offset;
      } else if (size === 1 && offset + 16 <= end) {
        // 64-bit extended size (use lower 32 bits for our bounded header buffer)
        size = readUInt32BE(buf, offset + 12);
        headerLen = 16;
      }
      if (size < headerLen || offset + size > end) break;

      const bodyStart = offset + headerLen;
      const bodyEnd = offset + size;

      if (insideIlst) {
        // Look for child 'data' atom inside ilst item
        let child = bodyStart;
        while (child + 16 <= bodyEnd) {
          const childSize = readUInt32BE(buf, child);
          const childType = decodeAscii(buf, child + 4, child + 8);
          if (childSize < 16 || child + childSize > bodyEnd) break;
          if (childType === 'data') {
            const dataFlags = readUInt32BE(buf, child + 8);
            const payload = buf.subarray(child + 16, child + childSize);
            const atomCode = buf[offset + 4]!;
            const restName = decodeAscii(buf, offset + 5, offset + 8);

            if (atomCode === 0xa9 && restName === 'nam') {
              const val = decodeUtf8(payload).trim();
              if (val) tags.title = val;
            } else if (atomCode === 0xa9 && restName === 'ART') {
              const val = decodeUtf8(payload).trim();
              if (val) tags.artist = val;
            } else if (atomCode === 0xa9 && restName === 'alb') {
              const val = decodeUtf8(payload).trim();
              if (val) tags.album = val;
            } else if (atomCode === 0xa9 && restName === 'gen') {
              const val = normalizeGenre(decodeUtf8(payload));
              if (val) tags.genre = val;
            } else if (type === 'gnre' && payload.length >= 2) {
              const genreIdx = readUInt16BE(payload, 0) - 1;
              if (genreIdx >= 0 && genreIdx < ID3V1_GENRES.length) {
                tags.genre = ID3V1_GENRES[genreIdx]!;
              }
            } else if (atomCode === 0xa9 && restName === 'day') {
              const val = parseYear(decodeUtf8(payload));
              if (val) tags.year = val;
            } else if (atomCode === 0xa9 && restName === 'lyr') {
              const val = decodeUtf8(payload).trim();
              if (val) tags.lyrics = val;
            } else if (type === 'covr' && !tags.artworkBytes && payload.length > 0) {
              tags.artworkBytes = payload.slice();
              tags.artworkMime = dataFlags === 14 ? 'image/png' : 'image/jpeg';
            }
          }
          child += childSize;
        }
      } else if (type === 'moov' || type === 'udta') {
        parseAtoms(bodyStart, bodyEnd, false);
      } else if (type === 'meta') {
        // 'meta' has 4-byte version/flags before child atoms
        parseAtoms(bodyStart + 4, bodyEnd, false);
      } else if (type === 'ilst') {
        parseAtoms(bodyStart, bodyEnd, true);
      }

      offset = bodyEnd;
    }
  };

  parseAtoms(0, buf.length, false);
  return tags;
}

let cachedArtworkDir: Directory | null = null;

function getArtworkCacheDir(): Directory {
  if (cachedArtworkDir) return cachedArtworkDir;
  const dir = new Directory(Paths.cache, 'artwork');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  cachedArtworkDir = dir;
  return dir;
}

function saveArtworkToCache(fileUri: string, bytes: Uint8Array, mime?: string): string | null {
  if (IS_WEB || bytes.length < 32) return null;
  try {
    const dir = getArtworkCacheDir();
    const ext = mime?.includes('png') ? 'png' : mime?.includes('webp') ? 'webp' : 'jpg';
    const filename = `${stableId('art', fileUri)}.${ext}`;
    const target = new File(dir, filename);
    if (!target.exists) {
      target.create({ intermediates: true, overwrite: true });
      target.writeSync(bytes);
    }
    return target.uri;
  } catch {
    return null;
  }
}

/**
 * Extracts real embedded tags (title, artist, album, genre, year, lyrics, artwork)
 * from an audio file URI using a single fast header read whenever possible.
 */
export async function extractAudioTags(
  fileUri: string,
  options?: { extractArtwork?: boolean }
): Promise<ExtractedAudioTags> {
  if (IS_WEB || !fileUri) return {};

  const extractArtwork = options?.extractArtwork ?? true;
  const INITIAL_CHUNK_BYTES = 64 * 1024; // 64 KB handles most ID3v2 headers in a single I/O call
  const MAX_ID3_BYTES = 1024 * 1024; // 1 MB max ID3v2 + cover art
  const MAX_CONTAINER_BYTES = 256 * 1024; // 256 KB for FLAC / M4A headers

  let handle: ReturnType<File['open']> | null = null;
  try {
    const file = new File(fileUri);
    if (!file.exists) return {};

    handle = file.open(FileMode.ReadOnly);
    const totalSize = handle.size ?? 0;
    if (totalSize <= 16) return { fileSize: totalSize };

    // Read first 64KB in a single native call (avoids probe + seek + re-read overhead)
    const firstChunkLen = Math.min(INITIAL_CHUNK_BYTES, totalSize);
    const firstChunk = await handle.readBytes(firstChunkLen);
    let parsed: BinaryAudioTags = {};

    // 1. Check ID3v2 ("ID3")
    if (firstChunk[0] === 0x49 && firstChunk[1] === 0x44 && firstChunk[2] === 0x33) {
      const tagSize = readSynchsafeInt(firstChunk, 6);
      const neededLen = Math.min(totalSize, Math.min(10 + tagSize, MAX_ID3_BYTES));

      let fullTag = firstChunk;
      if (neededLen > firstChunk.length) {
        const extraBytes = await handle.readBytes(neededLen - firstChunk.length);
        const merged = new Uint8Array(firstChunk.length + extraBytes.length);
        merged.set(firstChunk, 0);
        merged.set(extraBytes, firstChunk.length);
        fullTag = merged;
      }

      parsed = parseId3v2Buffer(fullTag);

      // Fallback to ID3v1 tail only if title/artist missing
      if ((!parsed.title || !parsed.artist) && totalSize >= 128) {
        handle.offset = totalSize - 128;
        const tail = await handle.readBytes(128);
        const v1 = parseId3v1Buffer(tail);
        parsed = {
          ...v1,
          ...parsed,
          title: parsed.title || v1.title,
          artist: parsed.artist || v1.artist,
          album: parsed.album || v1.album,
          genre: parsed.genre || v1.genre,
          year: parsed.year ?? v1.year,
        };
      }
    }
    // 2. Check FLAC ("fLaC")
    else if (
      firstChunk[0] === 0x66 &&
      firstChunk[1] === 0x4c &&
      firstChunk[2] === 0x61 &&
      firstChunk[3] === 0x43
    ) {
      let headerBuf = firstChunk;
      const targetLen = Math.min(totalSize, MAX_CONTAINER_BYTES);
      if (targetLen > firstChunk.length) {
        const extraBytes = await handle.readBytes(targetLen - firstChunk.length);
        const merged = new Uint8Array(firstChunk.length + extraBytes.length);
        merged.set(firstChunk, 0);
        merged.set(extraBytes, firstChunk.length);
        headerBuf = merged;
      }
      parsed = parseFlacBuffer(headerBuf);
    }
    // 3. Check MP4 / M4A ("ftyp" at offset 4)
    else if (
      firstChunk[4] === 0x66 &&
      firstChunk[5] === 0x74 &&
      firstChunk[6] === 0x79 &&
      firstChunk[7] === 0x70
    ) {
      let headBuf = firstChunk;
      const targetLen = Math.min(totalSize, MAX_CONTAINER_BYTES);
      if (targetLen > firstChunk.length) {
        const extraBytes = await handle.readBytes(targetLen - firstChunk.length);
        const merged = new Uint8Array(firstChunk.length + extraBytes.length);
        merged.set(firstChunk, 0);
        merged.set(extraBytes, firstChunk.length);
        headBuf = merged;
      }
      parsed = parseMp4Buffer(headBuf);
      // Some M4A files place 'moov' at the end of the file
      if (!parsed.title && !parsed.artist && totalSize > MAX_CONTAINER_BYTES) {
        const tailSize = Math.min(totalSize, MAX_CONTAINER_BYTES);
        handle.offset = totalSize - tailSize;
        const tailBuf = await handle.readBytes(tailSize);
        const tailParsed = parseMp4Buffer(tailBuf);
        parsed = { ...tailParsed, ...parsed };
      }
    }
    // 4. Fallback: ID3v1 at end of file
    else if (totalSize >= 128) {
      handle.offset = totalSize - 128;
      const tail = await handle.readBytes(128);
      parsed = parseId3v1Buffer(tail);
    }

    let artworkUri: string | null = null;
    if (extractArtwork && parsed.artworkBytes && parsed.artworkBytes.length > 0) {
      artworkUri = saveArtworkToCache(fileUri, parsed.artworkBytes, parsed.artworkMime);
    }

    return {
      title: parsed.title,
      artist: parsed.artist,
      album: parsed.album,
      genre: parsed.genre,
      year: parsed.year ?? null,
      lyrics: parsed.lyrics,
      artworkUri,
      fileSize: totalSize,
    };
  } catch {
    return {};
  } finally {
    try {
      handle?.close();
    } catch {
      // Ignore handle close error
    }
  }
}
