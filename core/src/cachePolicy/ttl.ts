import { QueryStorage } from '../index.js';

export const ttlPolicy = <T = unknown>(
  storage: QueryStorage<{ value: T; timeout: NodeJS.Timeout }>,
  options: {
    ttl?: number;
    debounce?: boolean;
  } = {}
): QueryStorage<T> => {
  const ttl = options.ttl ?? 60 * 1000; // Default ttl
  const createTimeout = (key: string, params: unknown) =>
    setTimeout(() => storage.clear(key, params), ttl);

  const updateTTL = (key: string, params: unknown) => {
    if (!options.debounce) return;
    if (!storage.has(key, params)) return;
    const entry = storage.get(key, params);
    clearTimeout(entry.timeout);
    const timeout = createTimeout(key, params);
    storage.set(key, params, { ...entry, timeout });
  };

  return {
    has(key, params) {
      return storage.has(key, params);
    },
    get(key, params) {
      updateTTL(key, params);
      const { value } = storage.get(key, params);
      return value;
    },
    set(key, params, value) {
      const timeout = createTimeout(key, params);
      storage.set(key, params, { value, timeout });
    },
    clear(key, params) {
      storage.clear(key, params);
    },
  };
};
