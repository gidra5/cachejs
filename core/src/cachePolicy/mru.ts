import { QueryStorage } from '../index.js';
import { ResizeCallback } from './sized.js';

export const mruPolicy = <T>(
  storage: QueryStorage<T>
): [QueryStorage<T>, ResizeCallback] => {
  type Entry = { key: string; params: unknown };
  const cache: Map<string, Entry> = new Map();

  const updateMRUOrder = (key: string, params: unknown) => {
    const cacheKey = generateKey(key, params);
    const entry = cache.get(cacheKey);
    if (!entry) return;

    // map entries are iterated in order of insertion
    // so we re-set key to move it to the end
    cache.delete(key);
    cache.set(key, entry);
  };

  const truncateCache = (targetSize: number = cache.size - 1) => {
    for (const [key, value] of [...cache.entries()].reverse()) {
      if (cache.size <= targetSize) break;

      cache.delete(key);
      storage.clear(value.key, value.params);
    }
  };

  const generateKey = (key: string, params: unknown) =>
    JSON.stringify([key, params]);

  const wrappedStorage: QueryStorage<T> = {
    has(key, params) {
      return storage.has(key, params);
    },
    get(key, params) {
      updateMRUOrder(key, params);
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
  };

  return [wrappedStorage, truncateCache];
};
