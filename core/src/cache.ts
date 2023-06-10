import { CacheManager, Endpoint, QueryStorage, handlers } from './index.js';

export class GenericQueryStorage<T = unknown> implements QueryStorage<T> {
  private store: Record<string, Map<string, T>> = {};

  get(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    return this.store[key]?.get(paramsKey) as T;
  }
  set(key: string, params: unknown, value: T) {
    const paramsKey = JSON.stringify(params);
    this.store[key] = new Map(this.store[key]).set(paramsKey, value);
  }
  has(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    return this.store[key]?.has(paramsKey) ?? false;
  }
  clear(key: string, params: unknown) {
    const paramsKey = JSON.stringify(params);
    const query = this.store[key];
    if (!query) return;
    query.delete(paramsKey);
  }
}

export const createCacheManager = <
  Endpoints extends Record<
    string,
    Endpoint<keyof typeof handlers, (...p: any[]) => Promise<unknown | void>>
  >
>(
  endpoints: Endpoints
): CacheManager<typeof handlers, Endpoints> => {
  const manager = new CacheManager(
    new GenericQueryStorage(),
    handlers,
    endpoints
  );
  return manager;
};
