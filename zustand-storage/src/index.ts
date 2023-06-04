import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { CacheManager, Endpoint, QueryStorage, handlers } from '@cachejs/core';

export const createZustandStorage = (): QueryStorage => {
  type QueryStore = Record<string, Map<string, unknown>>;
  const store = createStore(
    devtools<QueryStore>(() => ({}), { name: 'queryCache', serialize: true })
  );
  const { getState, setState } = store;
  // https://docs.pmnd.rs/zustand/guides/maps-and-sets-usage
  return {
    get(key, params) {
      const paramsKey = JSON.stringify(params);
      return getState()[key]?.get(paramsKey);
    },
    set(key, params, value) {
      const paramsKey = JSON.stringify(params);
      setState(
        (queries) => ({
          ...queries,
          [key]: new Map(queries[key]).set(paramsKey, value),
        }),
        false,
        { type: key, params }
      );
    },
    has(key, params) {
      const paramsKey = JSON.stringify(params);
      return getState()[key]?.has(paramsKey) ?? false;
    },
    clear(key, params) {
      const paramsKey = JSON.stringify(params);
      setState(
        (queries) => {
          const query = queries[key];
          if (!query) return queries;
          query.delete(paramsKey);
          return { ...queries, [key]: new Map(query) };
        },
        false,
        { type: key + '-clear', params }
      );
    },
  };
};

export const createZustandCacheManager = <
  Endpoints extends Record<
    string,
    Endpoint<keyof typeof handlers, (...p: any[]) => Promise<unknown | void>>
  >
>(
  endpoints: Endpoints
): CacheManager<typeof handlers, Endpoints> => {
  const manager = new CacheManager(createZustandStorage(), handlers, endpoints);
  return manager;
};
