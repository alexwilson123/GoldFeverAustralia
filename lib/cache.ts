type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = new Map<string, CacheEntry<unknown>>();
const defaultTtlMs = Number(process.env.CACHE_TTL_SECONDS ?? "1800") * 1000;

export function readCache<T>(key: string) {
  const hit = store.get(key);

  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return hit.value as T;
}

export function writeCache<T>(key: string, value: T, ttlMs = defaultTtlMs) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function getMaxFeatureLimit() {
  return Number(process.env.MAX_FEATURES_PER_REQUEST ?? "120");
}
