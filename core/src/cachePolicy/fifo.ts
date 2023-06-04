import { QueryStorage } from '../index.js';
import { ResizeCallback } from './sized.js';

export const fifoPolicy = <T>(
  storage: QueryStorage<T>
): [QueryStorage<T>, ResizeCallback] => {
  type Entry = { key: string; params: unknown };
  const cache: Map<string, Entry> = new Map();

  const truncateCache = (targetSize: number = cache.size - 1) => {
    for (const [key, value] of cache.entries()) {
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
