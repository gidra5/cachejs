import { QueryStorage } from '../index.js';

export const ttlPolicy = <T = unknown>(
  storage: QueryStorage<T>,
  options: {
    ttl?: number;
    debounce?: boolean;
  } = {}
): QueryStorage<T> => {
  const ttl = options.ttl ?? 60 * 1000; // Default ttl
  const createTimeout = (key: string, params: unknown) =>
    setTimeout(() => storage.clear(key, params), ttl);
  type Entry = NodeJS.Timeout;
  const cache: Map<string, Entry> = new Map();
  const generateKey = (key: string, params: unknown) =>
    JSON.stringify([key, params]);

  const updateTTL = (key: string, params: unknown) => {
    if (!options.debounce) return;
    if (!storage.has(key, params)) return;

    const cacheKey = generateKey(key, params);
    const entry = cache.get(cacheKey);
    entry && clearTimeout(entry);

    const timeout = createTimeout(key, params);
    cache.set(cacheKey, timeout);
  };

  return {
    has(key, params) {
      return storage.has(key, params);
    },
    get(key, params) {
      updateTTL(key, params);
      return storage.get(key, params);
    },
    set(key, params, value) {
      const cacheKey = generateKey(key, params);
      const timeout = createTimeout(key, params);
      cache.set(cacheKey, timeout);
      storage.set(key, params, value);
    },
    clear(key, params) {
      storage.clear(key, params);
    },
  };
};
