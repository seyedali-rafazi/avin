export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}_${random}` : `${time}_${random}`;
}

/**
 * Deterministic slug/hash ID for deduplicating albums, artists, or files.
 */
export function stableId(prefix: string, raw: string): string {
  let hash = 2166136261;
  const normalized = raw.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}
