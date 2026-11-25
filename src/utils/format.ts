const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '۰';
  return toPersianDigits(value.toLocaleString('en-US')).replace(/,/g, '٬');
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '۰:۰۰';
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hours > 0) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return toPersianDigits(`${hours}:${paddedMins}:${paddedSecs}`);
  }
  return toPersianDigits(`${minutes}:${paddedSecs}`);
}

export function formatSongCount(count: number): string {
  return `${formatNumber(count)} آهنگ`;
}

export function formatCount(count: number, unit: string): string {
  return `${formatNumber(count)} ${unit}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '۰ بایت';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  const formatted = val.toFixed(idx === 0 ? 0 : 1);
  return `${toPersianDigits(formatted)} ${units[idx]}`;
}

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'ظهر بخیر';
  if (hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

export function formatSpeedLabel(rate: number): string {
  const formatted = Number.isInteger(rate) ? `${rate}.0` : `${rate}`;
  return `${toPersianDigits(formatted)}×`;
}

const KNOWN_ENGLISH_FALLBACKS: Record<string, string> = {
  'Unknown Artist': 'هنرمند ناشناس',
  'Unknown Album': 'آلبوم ناشناس',
  'Unknown Genre': 'سبک ناشناس',
  'Untitled Track': 'آهنگ بدون عنوان',
  'Device Storage': 'حافظه دستگاه',
  Imported: 'واردشده',
};

export function localizeMetadata(value: string | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return KNOWN_ENGLISH_FALLBACKS[trimmed] ?? trimmed;
}

export function isUnknownAlbum(album: string | null | undefined): boolean {
  if (!album) return true;
  const trimmed = album.trim();
  return trimmed === 'Unknown Album' || trimmed === 'آلبوم ناشناس';
}
