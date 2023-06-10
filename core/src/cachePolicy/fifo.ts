import { QueryStorage, TruncatableQueryStorage } from '../index.js';

export const fifoPolicy = <T>(
  storage: QueryStorage<T>
): TruncatableQueryStorage<T> => {
  type Entry = { key: string; params: unknown };
  const cache: Map<string, Entry> = new Map();

  const generateKey = (key: string, params: unknown) =>
    JSON.stringify([key, params]);

  return {
    has(key, params) {
      return storage.has(key, params);
    },
    get(key, params) {
      return storage.get(key, params);
    },
    set(key, params, value) {
      const cacheKey = generateKey(key, params);
      cache.set(cacheKey, { key, params });
      storage.set(key, params, value);
    },
    clear(key, params) {
      const cacheKey = generateKey(key, params);
      cache.delete(cacheKey);
      storage.clear(key, params);
    },
    truncate(count = 1) {
      for (const [key, value] of [...cache.entries()].reverse()) {
        if (count <= 0) break;

        cache.delete(key);
        storage.clear(value.key, value.params);
        count--;
      }
    },
  };
};
