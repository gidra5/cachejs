import {
  CacheManager,
  Endpoint,
  EndpointHandler,
  QueryStorage,
} from './index.js';

const queryHandler: EndpointHandler = <
  T extends string,
  F extends (...p: any[]) => Promise<unknown>
>(
  storage: QueryStorage,
  manager: CacheManager,
  queryName: string,
  endpoint: Endpoint<T, F>,
  params: Parameters<F>
): ReturnType<F> => {
  if (storage.has(queryName, params)) {
    return storage.get(queryName, params) as ReturnType<F>;
  }

  return endpoint.request(...params).then((_result) => {
    const result = _result;
    storage.set(queryName, params, result);

    const queryTags = endpoint.tags?.(params, result) ?? [];
    if (queryTags.length === 0) return result;

    const handler = (tags: string[], noClearOnInvalidate?: boolean) => {
      const invalidatedTags = tags.filter((tag) => queryTags.includes(tag));
      if (invalidatedTags.length === 0) return;

      manager.off('invalidate', handler);
      manager.emit(
        'invalidatedQuery',
        queryName,
        params,
        result,
        invalidatedTags
      );

      if (!(endpoint.noClearOnInvalidate || noClearOnInvalidate))
        storage.clear(queryName, params);
    };
    manager.on('invalidate', handler);

    return result;
  }) as ReturnType<F>;
};

const mutationHandler: EndpointHandler = <
  T extends string,
  F extends (...p: any[]) => Promise<unknown>
>(
  storage: QueryStorage,
  manager: CacheManager,
  queryName: string,
  endpoint: Endpoint<T, F>,
  params: Parameters<F>
): ReturnType<F> => {
  return endpoint.request(...params).then((result) => {
    const queryTags = endpoint.tags?.(params, result) ?? [];

    if (queryTags.length === 0) return result;
    manager.emit('invalidate', queryTags, endpoint.noClearOnInvalidate);

    return result;
  }) as ReturnType<F>;
};

export const handlers = { query: queryHandler, mutation: mutationHandler };
