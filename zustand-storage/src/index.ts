import { createStore } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import { CacheManager, Endpoint, QueryStorage, handlers } from '@cachejs/core';

// https://docs.pmnd.rs/zustand/guides/maps-and-sets-usage
export class ZustandQueryStorage<T = unknown> implements QueryStorage<T> {
  private store = createStore(
    devtools<Record<string, Map<string, unknown>>>(() => ({}), {
      name: 'queryCache',
      serialize: true,
    })
  );

  get(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    return this.store.getState()[key]?.get(paramsKey) as T;
  }
  set(key: string, params: unknown, value: T) {
    const paramsKey = JSON.stringify(params);
    this.store.setState(
      (queries) => ({
        ...queries,
        [key]: new Map(queries[key]).set(paramsKey, value),
      }),
      false,
      { type: key, params }
    );
  }
  has(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    return this.store.getState()[key]?.has(paramsKey) ?? false;
  }
  clear(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    this.store.setState(
      (queries) => {
        const query = queries[key];
        if (!query) return queries;
        query.delete(paramsKey);
        return { ...queries, [key]: new Map(query) };
      },
      false,
      { type: key + '-clear', params }
    );
  }
}

export class ZustandCacheManager<
  Endpoints extends Record<
    string,
    Endpoint<keyof typeof handlers & string, (...p: any[]) => Promise<unknown>>
  >
> extends CacheManager<typeof handlers, Endpoints> {
  constructor(endpoints: Endpoints) {
    super(new ZustandQueryStorage(), handlers, endpoints);
  }
}
