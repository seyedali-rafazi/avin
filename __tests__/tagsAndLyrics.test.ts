jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  FileMode: { ReadOnly: 'r' },
  Paths: { cache: 'file:///cache', document: 'file:///doc' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

import {
  parseFlacBuffer,
  parseId3v1Buffer,
  parseId3v2Buffer,
} from '@/services/metadata/binaryTagReader';
import { getActiveLyricIndex, parseLyrics } from '@/services/lyrics/lyricsService';
import {
  computeEffectiveVolumeMultiplier,
  getPresetBands,
} from '@/services/audio/equalizerService';

function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function buildId3v23Frame(id: string, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(10 + payload.length);
  for (let i = 0; i < 4; i++) frame[i] = id.charCodeAt(i);
  const size = payload.length;
  frame[4] = (size >>> 24) & 0xff;
  frame[5] = (size >>> 16) & 0xff;
  frame[6] = (size >>> 8) & 0xff;
  frame[7] = size & 0xff;
  frame.set(payload, 10);
  return frame;
}

function encodeSynchsafe(n: number): [number, number, number, number] {
  return [(n >>> 21) & 0x7f, (n >>> 14) & 0x7f, (n >>> 7) & 0x7f, n & 0x7f];
}

describe('binaryTagReader', () => {
  test('parses ID3v2.3 UTF-8 Persian title, artist, album, genre, year, and USLT lyrics', () => {
    const textPayload = (text: string) => {
      const b = encodeUtf8(text);
      const out = new Uint8Array(1 + b.length);
      out[0] = 3; // UTF-8
      out.set(b, 1);
      return out;
    };

    const lyricsBytes = encodeUtf8('خط اول ترانه\nخط دوم ترانه');
    const usltPayload = new Uint8Array(1 + 3 + 1 + lyricsBytes.length);
    usltPayload[0] = 3; // UTF-8
    usltPayload[1] = 0x66; // 'f'
    usltPayload[2] = 0x61; // 'a'
    usltPayload[3] = 0x73; // 's'
    usltPayload[4] = 0; // empty descriptor null terminator
    usltPayload.set(lyricsBytes, 5);

    const frames = [
      buildId3v23Frame('TIT2', textPayload('باران')),
      buildId3v23Frame('TPE1', textPayload('محسن چاوشی')),
      buildId3v23Frame('TALB', textPayload('آلبوم تست')),
      buildId3v23Frame('TCON', textPayload('(13)')), // Pop
      buildId3v23Frame('TYER', textPayload('1403')),
      buildId3v23Frame('USLT', usltPayload),
    ];

    const bodyLen = frames.reduce((sum, f) => sum + f.length, 0);
    const buf = new Uint8Array(10 + bodyLen);
    buf[0] = 0x49; // I
    buf[1] = 0x44; // D
    buf[2] = 0x33; // 3
    buf[3] = 3; // v2.3
    buf[4] = 0;
    buf[5] = 0;
    const ss = encodeSynchsafe(bodyLen);
    buf[6] = ss[0];
    buf[7] = ss[1];
    buf[8] = ss[2];
    buf[9] = ss[3];

    let offset = 10;
    for (const f of frames) {
      buf.set(f, offset);
      offset += f.length;
    }

    const parsed = parseId3v2Buffer(buf);
    expect(parsed.title).toBe('باران');
    expect(parsed.artist).toBe('محسن چاوشی');
    expect(parsed.album).toBe('آلبوم تست');
    expect(parsed.genre).toBe('Pop');
    expect(parsed.year).toBe(1403);
    expect(parsed.lyrics).toBe('خط اول ترانه\nخط دوم ترانه');
  });

  test('parses ID3v1 tail buffer', () => {
    const tail = new Uint8Array(128);
    const writeAscii = (str: string, start: number) => {
      for (let i = 0; i < str.length; i++) tail[start + i] = str.charCodeAt(i);
    };
    writeAscii('TAG', 0);
    writeAscii('Sunset Road', 3);
    writeAscii('Avin Band', 33);
    writeAscii('Night Drive', 63);
    writeAscii('2024', 93);
    tail[127] = 17; // Rock

    const parsed = parseId3v1Buffer(tail);
    expect(parsed.title).toBe('Sunset Road');
    expect(parsed.artist).toBe('Avin Band');
    expect(parsed.album).toBe('Night Drive');
    expect(parsed.year).toBe(2024);
    expect(parsed.genre).toBe('Rock');
  });

  test('parses FLAC VORBIS_COMMENT metadata block', () => {
    const vendor = encodeUtf8('avin');
    const comments = [
      encodeUtf8('TITLE=FLAC Song'),
      encodeUtf8('ARTIST=FLAC Artist'),
      encodeUtf8('ALBUM=Lossless'),
      encodeUtf8('GENRE=Jazz'),
      encodeUtf8('DATE=2025'),
    ];
    const blockLen =
      4 + vendor.length + 4 + comments.reduce((s, c) => s + 4 + c.length, 0);
    const buf = new Uint8Array(4 + 4 + blockLen);
    buf.set(encodeUtf8('fLaC'), 0);
    buf[4] = 0x80 | 4; // last block + VORBIS_COMMENT (4)
    buf[5] = (blockLen >>> 16) & 0xff;
    buf[6] = (blockLen >>> 8) & 0xff;
    buf[7] = blockLen & 0xff;

    let pos = 8;
    const writeU32LE = (n: number) => {
      buf[pos++] = n & 0xff;
      buf[pos++] = (n >>> 8) & 0xff;
      buf[pos++] = (n >>> 16) & 0xff;
      buf[pos++] = (n >>> 24) & 0xff;
    };
    writeU32LE(vendor.length);
    buf.set(vendor, pos);
    pos += vendor.length;
    writeU32LE(comments.length);
    for (const c of comments) {
      writeU32LE(c.length);
      buf.set(c, pos);
      pos += c.length;
    }

    const parsed = parseFlacBuffer(buf);
    expect(parsed.title).toBe('FLAC Song');
    expect(parsed.artist).toBe('FLAC Artist');
    expect(parsed.album).toBe('Lossless');
    expect(parsed.genre).toBe('Jazz');
    expect(parsed.year).toBe(2025);
  });
});

describe('lyricsService', () => {
  test('parses synced LRC timestamps including multi-timestamp lines and finds active line', () => {
    const lrc = `
[00:05.00] First line
[00:12.50][00:30.00] Chorus line
[00:20.00] Second verse
`;
    const parsed = parseLyrics(lrc);
    expect(parsed.isSynced).toBe(true);
    expect(parsed.lines).toHaveLength(4);
    expect(parsed.lines.map((l) => l.time)).toEqual([5, 12.5, 20, 30]);
    expect(getActiveLyricIndex(parsed.lines, 2)).toBe(-1);
    expect(getActiveLyricIndex(parsed.lines, 6)).toBe(0);
    expect(getActiveLyricIndex(parsed.lines, 15)).toBe(1);
    expect(getActiveLyricIndex(parsed.lines, 31)).toBe(3);
  });

  test('falls back to plain unsynced lyrics when no timestamps exist', () => {
    const parsed = parseLyrics('Line A\nLine B');
    expect(parsed.isSynced).toBe(false);
    expect(parsed.lines).toEqual([
      { time: null, text: 'Line A' },
      { time: null, text: 'Line B' },
    ]);
  });
});

describe('equalizerService', () => {
  test('returns preset bands and computes bounded volume multiplier', () => {
    expect(getPresetBands('bass-boost')).toEqual([8, 5, 1, 0, 0]);
    expect(computeEffectiveVolumeMultiplier(false, [8, 8, 8, 8, 8], true)).toBe(1.0);
    const mult = computeEffectiveVolumeMultiplier(true, [-12, -12, -12, -12, -12], false);
    expect(mult).toBeGreaterThanOrEqual(0.7);
    expect(mult).toBeLessThanOrEqual(1.0);
  });
});
