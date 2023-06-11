import { QueryStorage } from './index.js';

export class GenericQueryStorage<T = unknown> implements QueryStorage<T> {
  private store: Map<string, T> = new Map();

  private getStoreKey(key: string, params: unknown) {
    return JSON.stringify([key, params]);
  }

  get(key: string, params: unknown) {
    return this.store.get(this.getStoreKey(key, params)) as T;
  }
  set(key: string, params: unknown, value: T) {
    const storeKey = this.getStoreKey(key, params);
    this.store.set(storeKey, value);
  }
  has(key: string, params: unknown) {
    const storeKey = this.getStoreKey(key, params);

    return this.store.has(storeKey);
  }
  clear(key: string, params: unknown) {
    const storeKey = this.getStoreKey(key, params);
    this.store.delete(storeKey);
  }
}
