type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await loader();
  return cacheSet(key, fresh, ttlMs);
}
