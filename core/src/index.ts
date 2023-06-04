import { EventEmitter } from 'ee-ts';
import { assert } from './utils.js';
export * from './handlers.js';
export * from './cache.js';

export interface QueryStorage {
  get(key: string, params: unknown): unknown;
  has(key: string, params: unknown): boolean;
  set(key: string, params: unknown, value: unknown): void;
  clear(key: string, params: unknown): void;
}

type _Endpoint<T extends string, P extends unknown[], R> = {
  type: T;
  request: (...params: P) => Promise<R>;
  optimisticRequest?: (store: QueryStorage, ...queryParams: P) => R;
  tags?: (args: P, result: R) => string[];
  noClearOnInvalidate?: boolean;
};

export type Endpoint<
  T extends string,
  F extends (...p: any[]) => Promise<unknown>
> = _Endpoint<
  T,
  Parameters<F>,
  ReturnType<F> extends PromiseLike<infer V> ? V : ReturnType<F>
>;

export type EndpointHandler = <
  T extends string,
  F extends (...p: any[]) => Promise<unknown>
>(
  storage: QueryStorage,
  manager: CacheManager,
  queryName: string,
  endpoint: Endpoint<T, F>,
  params: Parameters<F>
) => ReturnType<F>;

export interface Cache<T extends string> {
  execute<F extends (...p: any[]) => Promise<unknown>>(
    queryName: string,
    endpoint: Endpoint<T, F>,
    params: Parameters<F>
  ): ReturnType<F>;
  invalidate(tags: string[]): void;
}

interface CacheManagerEvents {
  invalidate(tags: string[], noClearOnInvalidate?: boolean): void;
  invalidateQuery(
    invalidatedQueryName: string,
    invalidatedQueryParams: unknown[],
    storeValue: unknown,
    invalidatedTags: string[]
  ): void;
}

export class CacheManager<
    Handlers extends Record<string, EndpointHandler> = Record<
      string,
      EndpointHandler
    >,
    Endpoints extends Record<
      string,
      Endpoint<keyof Handlers & string, (...p: any[]) => Promise<unknown>>
    > = Record<
      string,
      Endpoint<keyof Handlers & string, (...p: any[]) => Promise<unknown>>
    >
  >
  extends EventEmitter<CacheManagerEvents>
  implements Cache<keyof Handlers & string>
{
  constructor(
    private storage: QueryStorage,
    private handlers: Handlers,
    readonly registry: Endpoints
  ) {
    super();
  }

  register<K extends keyof Endpoints>(
    queryName: K,
    endpoint: Endpoints[K]
  ): void {
    this.registry[queryName] = endpoint;
  }

  execute<F extends (...p: any[]) => Promise<unknown>>(
    queryName: string,
    endpoint: Endpoint<keyof Handlers & string, F>,
    params: Parameters<F>
  ): ReturnType<F> {
    const handler = this.handlers[endpoint.type];
    const fetch = async () =>
      await handler(this.storage, this, queryName, endpoint, params);

    if (endpoint.optimisticRequest) {
      const result = endpoint.optimisticRequest(this.storage, ...params);
      fetch();
      return result as ReturnType<F>;
    }

    return fetch() as ReturnType<F>;
  }

  executeEndpoint<K extends keyof Endpoints>(
    queryName: K,
    params: Parameters<Endpoints[K]['request']>,
    options?: Partial<Omit<Endpoints[K], 'request'>>
  ): ReturnType<Endpoints[K]['request']> {
    const endpoint = { ...this.registry[queryName], ...options };

    // for some reason ts says `K extends keyof Endpoints` may be other than string
    assert(typeof queryName === 'string', 'queryName can only be string');

    return this.execute(queryName, endpoint as Endpoints[K], params);
  }

  invalidate(tags: string[]): void {
    if (tags.length === 0) return;
    this.emit('invalidate', tags);
  }
}
