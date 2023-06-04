import { DependencyList, useEffect, useState } from 'react';
import { useAsync, useAsyncFn } from './utils.js';
import { CacheManager, Endpoint, EndpointHandler } from '@cachejs/core';

export const createCacheManagerHooks = <
  Handlers extends Record<string, EndpointHandler>,
  Endpoints extends Record<
    string,
    Endpoint<keyof Handlers & string, (...p: any[]) => Promise<unknown>>
  >
>(
  manager: CacheManager<Handlers, Endpoints>
) => {
  const useRequest = <K extends keyof Endpoints>(
    queryName: K,
    options?: Partial<Omit<Endpoints[K], 'request'>>
  ) => {
    const executor =
      (): Endpoints[K]['request'] =>
      (...params) =>
        manager.executeEndpoint(
          queryName,
          params as Parameters<Endpoints[K]['request']>,
          options
        );
    const [execute, setExecutor] = useState(executor);
    useEffect(() => {
      const handler = manager.on(
        'invalidatedQuery',
        (invalidatedQueryName) =>
          invalidatedQueryName === queryName && setExecutor(executor)
      );

      return () => void manager.off('invalidatedQuery', handler);
    }, []);
    return execute;
  };
  const useRequestState = <K extends keyof Endpoints>(queryName: K) => {
    const execute = useRequest(queryName);
    const state = useAsyncFn(execute, [execute]);
    return state;
  };
  const useQuery = <K extends keyof Endpoints>(
    queryName: K,
    params: Parameters<Endpoints[K]['request']>,
    _options?: Partial<Omit<Endpoints[K], 'request'>> & {
      deps?: DependencyList;
      skip?: boolean;
    }
  ) => {
    const { deps = [], skip, ...options } = _options ?? {};
    const executor = () => () =>
      !skip
        ? manager.executeEndpoint(
            queryName,
            params,
            options as Partial<Omit<Endpoints[K], 'request'>>
          )
        : Promise.resolve(undefined);
    const [execute, setExecutor] = useState(executor);
    useEffect(() => {
      const handler = manager.on(
        'invalidatedQuery',
        (invalidatedQueryName, invalidatedQueryParams) =>
          invalidatedQueryName === queryName &&
          JSON.stringify(params) === JSON.stringify(invalidatedQueryParams) &&
          setExecutor(executor)
      );

      return () => void manager.off('invalidatedQuery', handler);
    }, []);
    const queryState = useAsync(execute, [execute, skip, ...deps]);
    return queryState;
  };

  return { useQuery, useRequest, useRequestState };
};
