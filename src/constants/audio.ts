export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
  '.opus',
  '.wma',
  '.alac',
  '.aiff',
] as const;

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/*',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
] as const;

export const APP_INFO = {
  name: 'آوین',
  version: '1.0.0',
  tagline: 'پخش‌کننده موسیقی آفلاین و محلی',
} as const;
