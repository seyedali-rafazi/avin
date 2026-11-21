export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hours > 0) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }
  return `${minutes}:${paddedSecs}`;
}

export function formatSongCount(count: number): string {
  return count === 1 ? '1 song' : `${count.toLocaleString('en-US')} songs`;
}

export function formatCount(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count.toLocaleString('en-US')} ${plural}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatSpeedLabel(rate: number): string {
  return `${Number.isInteger(rate) ? `${rate}.0` : rate}x`;
}
