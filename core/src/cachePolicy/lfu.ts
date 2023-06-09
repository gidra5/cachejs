import { QueryStorage, TruncatableQueryStorage } from '../index.js';

export const lfuPolicy = <T>(
  storage: QueryStorage<T>
): TruncatableQueryStorage<T> => {
  type Entry = { id: string; key: string; params: unknown; count: number };
  const items: Entry[] = [];

  const updateLFUOrder = (key: string) => {
    const index = items.findIndex(({ id }) => id === key);
    if (index === -1) return;
    items[index].count++;
    if (!items[index + 1]) return;

    // if after increment items are out of order - move current item
    if (items[index].count > items[index + 1].count) {
      const [item] = items.splice(index, 1);
      const newIndex = items.findIndex(({ count }) => count > item.count);
      items.splice(newIndex);
    }
  };

  const generateKey = (key: string, params: unknown) =>
    JSON.stringify([key, params]);

  return {
    has(key, params) {
      return storage.has(key, params);
    },
    get(key, params) {
      updateLFUOrder(generateKey(key, params));
      return storage.get(key, params);
    },
    set(key, params, value) {
      const cacheKey = generateKey(key, params);
      const index = items.findIndex(({ id }) => id === cacheKey);
      if (index === -1) items.unshift({ id: cacheKey, key, params, count: 1 });
      storage.set(key, params, value);
    },
    clear(key, params) {
      const cacheKey = generateKey(key, params);
      const index = items.findIndex(({ id }) => id === cacheKey);
      items.splice(index, 1);
      storage.clear(key, params);
    },
    truncate(count = 1) {
      const spliced = items.splice(0, count);
      for (const { key, params } of spliced) storage.clear(key, params);
    },
  };
};
