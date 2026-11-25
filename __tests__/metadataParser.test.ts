import {
  extractFolderFromUri,
  isSupportedAudioFile,
  parseMetadataFromFilename,
} from '@/services/metadata/audioMetadataParser';
import { formatDuration, formatFileSize, formatSpeedLabel } from '@/utils/format';

describe('audioMetadataParser', () => {
  test('detects supported audio extensions', () => {
    expect(isSupportedAudioFile('track.mp3')).toBe(true);
    expect(isSupportedAudioFile('track.FLAC')).toBe(true);
    expect(isSupportedAudioFile('track.m4a')).toBe(true);
    expect(isSupportedAudioFile('cover.jpg')).toBe(false);
    expect(isSupportedAudioFile('notes.txt')).toBe(false);
  });

  test('extracts meaningful folder segments from file URIs', () => {
    expect(extractFolderFromUri('file:///storage/emulated/0/Music/Synthwave/track.mp3')).toBe(
      'Music/Synthwave'
    );
    expect(extractFolderFromUri('track.mp3')).toBe('حافظه دستگاه');
  });

  test('parses artist and title from filename with track number', () => {
    const parsed = parseMetadataFromFilename(
      '01 - The Weeknd - Blinding Lights.mp3',
      'file:///storage/emulated/0/Music/After Hours/01 - The Weeknd - Blinding Lights.mp3'
    );
    expect(parsed.artist).toBe('The Weeknd');
    expect(parsed.title).toBe('Blinding Lights');
    expect(parsed.album).toBe('After Hours');
  });

  test('handles missing artist gracefully', () => {
    const parsed = parseMetadataFromFilename(
      'ambient_demo.wav',
      'file:///storage/emulated/0/Downloads/ambient_demo.wav'
    );
    expect(parsed.artist).toBe('هنرمند ناشناس');
    expect(parsed.title).toBe('ambient demo');
    expect(parsed.album).toBe('آلبوم ناشناس');
  });
});

describe('format utilities', () => {
  test('formats durations cleanly in Persian digits', () => {
    expect(formatDuration(0)).toBe('۰:۰۰');
    expect(formatDuration(84)).toBe('۱:۲۴');
    expect(formatDuration(3665)).toBe('۱:۰۱:۰۵');
    expect(formatDuration(-5)).toBe('۰:۰۰');
  });

  test('formats file sizes and playback speeds in Persian', () => {
    expect(formatFileSize(0)).toBe('۰ بایت');
    expect(formatFileSize(1536)).toBe('۱.۵ کیلوبایت');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('۵.۰ مگابایت');
    expect(formatSpeedLabel(1)).toBe('۱.۰×');
    expect(formatSpeedLabel(1.25)).toBe('۱.۲۵×');
  });
});
