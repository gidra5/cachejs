import { QueryStorage } from '../index.js';
import { throttle } from '../utils.js';

export type ResizeCallback = (size?: number) => void;

export const sizedPolicy = (
  storage: QueryStorage,
  resize: ResizeCallback,
  options: {
    throttle?: number;
    size?: number;
  } = {}
): QueryStorage => {
  const maxSize = options.size ?? 100; // Default maximum size of cache
  let currentSize = 0;

  const _truncateCache = () => {
    if (currentSize <= maxSize) return;
    resize(maxSize);
    currentSize = maxSize;
  };

  const truncateCache = options.throttle
    ? throttle(options.throttle, _truncateCache)
    : _truncateCache;

  return {
    get(key, params) {
      return storage.get(key, params);
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
