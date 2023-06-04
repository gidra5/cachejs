import { CacheManager, Endpoint, QueryStorage, handlers } from './index.js';

export const createQueryStorage = (): QueryStorage => {
  type QueryStore = Record<string, Map<string, unknown>>;
  const store: QueryStore = {};
  return {
    get(key, params) {
      const paramsKey = JSON.stringify(params);
      return store[key]?.get(paramsKey);
    },
    set(key, params, value) {
      const paramsKey = JSON.stringify(params);
      store[key] = new Map(store[key]).set(paramsKey, value);
    },
    has(key, params) {
      const paramsKey = JSON.stringify(params);
      return store[key]?.has(paramsKey) ?? false;
    },
    clear(key, params) {
      const paramsKey = JSON.stringify(params);
      const query = store[key];
      if (!query) return;
      query.delete(paramsKey);
    },
  };
};

export const createCacheManager = <
  Endpoints extends Record<
    string,
    Endpoint<keyof typeof handlers, (...p: any[]) => Promise<unknown | void>>
  >
>(
  endpoints: Endpoints
): CacheManager<typeof handlers, Endpoints> => {
  const manager = new CacheManager(createQueryStorage(), handlers, endpoints);
  return manager;
};
