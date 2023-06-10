import { TruncatableQueryStorage } from '../index.js';
import { throttle } from '../utils.js';

export const sizedCache = <T>(
  storage: TruncatableQueryStorage<T>,
  options: {
    throttle?: number;
    size?: number;
  } = {}
): TruncatableQueryStorage<T> => {
  const maxSize = options.size ?? 100; // Default maximum size of cache
  let currentSize = 0;

  const _truncateCache = () => {
    if (currentSize <= maxSize) return;
    storage.truncate(currentSize - maxSize);
    currentSize = maxSize;
  };

  const truncateCache = options.throttle
    ? throttle(options.throttle, _truncateCache)
    : _truncateCache;

  return {
    get(key, params) {
      return storage.get(key, params);
    },
    truncate(count) {
      return storage.truncate(count);
    },
    has(key, params) {
      return storage.has(key, params);
    },
    set(key, params, value) {
      if (!storage.has(key, params)) currentSize++;
      storage.set(key, params, value);
      truncateCache();
    },
    clear(key, params) {
      if (storage.has(key, params)) currentSize--;
      storage.clear(key, params);
    },
  };
};
