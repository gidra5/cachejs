import * as cachejs from '../src/index';
import { assert, beforeEach, describe, expect, vi } from 'vitest';
import { it, fc } from '@fast-check/vitest';

// pass fixed seed, so that it are deterministic
describe('generic query storage', function () {
  const { GenericQueryStorage } = cachejs;
  it.concurrent.prop([fc.string(), fc.anything(), fc.anything()])(
    'should store and retrieve values correctly',
    (key, params, value) => {
      const queryStorage = new GenericQueryStorage();

      queryStorage.set(key, params, value);
      const retrievedValue = queryStorage.get(key, params);
      expect(retrievedValue).to.equal(value);
    }
  );

  it.concurrent.prop([fc.string(), fc.clone(fc.anything(), 2)])(
    'should compare params structurally',
    (key, [params, paramsClone]) => {
      const queryStorage = new GenericQueryStorage();

      queryStorage.set(key, params, {});
      const retrievedValue = queryStorage.get(key, params);
      const retrievedValue2 = queryStorage.get(key, paramsClone);
      expect(retrievedValue).to.equal(retrievedValue2);
    }
  );

  it.concurrent.prop([fc.string(), fc.anything(), fc.anything()], {
    examples: [
      ['', [], ''],
      ['', {}, false],
      ['', [], {}],
    ],
  })('should correctly check if a key exists', (key, params, value) => {
    const queryStorage = new GenericQueryStorage();

    expect(queryStorage.has(key, params)).to.be.false;
    queryStorage.set(key, params, value);
    expect(queryStorage.has(key, params)).to.be.true;
  });

  it.concurrent.prop([fc.string(), fc.anything(), fc.anything()], {
    examples: [['toString', {}, '']],
  })('should clear values correctly', (key, params, value) => {
    const queryStorage = new GenericQueryStorage();

    queryStorage.set(key, params, value);
    expect(queryStorage.has(key, params)).to.be.true;
    queryStorage.clear(key, params);
    expect(queryStorage.has(key, params)).to.be.false;
  });

  it.concurrent.prop(
    [fc.string(), fc.anything(), fc.anything(), fc.anything()],
    {
      examples: [['toString', false, [], []]],
    }
  )(
    'should always return the last set value for a key',
    (key, params, value1, value2) => {
      const queryStorage = new GenericQueryStorage();

      queryStorage.set(key, params, value1);
      queryStorage.set(key, params, value2);
      const retrievedValue = queryStorage.get(key, params);
      expect(retrievedValue).to.equal(value2);
    }
  );
});

describe('standard query handler', () => {
  const {
    handlers: { query: queryHandler },
    GenericCacheManager,
  } = cachejs;

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should call endpoint.request',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = { request: vi.fn().mockResolvedValue(expectedResult), type: 'query' };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const spyRequest = vi.spyOn(endpoint, 'request');

      const result = await queryHandler(manager, queryName, endpoint, params);

      expect(result).to.equal(expectedResult);
      expect(spyRequest).toHaveBeenCalledWith(...params);
    }
  );

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should store the result if not cached',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = { request: vi.fn().mockResolvedValue(expectedResult), type: 'query' };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const storageSetSpy = vi.spyOn(manager.storage, 'set');
      await queryHandler(manager, queryName, endpoint, params);

      expect(storageSetSpy).toHaveBeenCalledWith(
        queryName,
        params,
        expectedResult
      );
    }
  );

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should check and get value if query is cached before actual request',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = { request: vi.fn().mockResolvedValue(expectedResult), type: 'query' };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const storageGetSpy = vi
        .spyOn(manager.storage, 'get')
        .mockReturnValue(expectedResult);
      const storageHasSpy = vi
        .spyOn(manager.storage, 'has')
        .mockReturnValue(true);
      const spyRequest = vi.spyOn(endpoint, 'request');
      const result = await queryHandler(manager, queryName, endpoint, params);

      expect(result).toBe(expectedResult);
      expect(spyRequest).not.toBeCalled();
      expect(storageHasSpy).toHaveBeenCalledWith(queryName, params);
      expect(storageGetSpy).toHaveBeenCalledWith(queryName, params);
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should not handle invalidation without invalidated tags',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const managerOnSpy = vi.spyOn(manager, 'on');
      const managerOffSpy = vi.spyOn(manager, 'off');
      await queryHandler(manager, queryName, endpoint, params);

      const handler = managerOnSpy.mock.calls[0][1] as any;

      handler([]);

      expect(managerOffSpy).not.toBeCalled();
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should handle invalidation',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const managerOnSpy = vi.spyOn(manager, 'on');
      const managerOffSpy = vi.spyOn(manager, 'off');
      await queryHandler(manager, queryName, endpoint, params);

      expect(managerOnSpy).toBeCalledWith('invalidate', expect.any(Function));

      const handler = managerOnSpy.mock.calls[0][1] as any;
      handler(tags);

      expect(endpoint.tags).toBeCalled();
      expect(managerOffSpy).toBeCalledWith('invalidate', handler);
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should not clear cache if endpoint.noClearOnInvalidate is true',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        noClearOnInvalidate: true,
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const storageClearSpy = vi.spyOn(manager.storage, 'clear');
      const managerOnSpy = vi.spyOn(manager, 'on');
      await queryHandler(manager, queryName, endpoint, params);

      expect(managerOnSpy).toBeCalledWith('invalidate', expect.any(Function));

      const handler = managerOnSpy.mock.calls[0][1] as any;
      handler(tags);

      expect(storageClearSpy).not.toBeCalled();
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should not clear cache if noClearOnInvalidate was passed as true',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const storageClearSpy = vi.spyOn(manager.storage, 'clear');
      const managerOnSpy = vi.spyOn(manager, 'on');
      await queryHandler(manager, queryName, endpoint, params);

      expect(managerOnSpy).toBeCalledWith('invalidate', expect.any(Function));

      const handler = managerOnSpy.mock.calls[0][1] as any;
      handler(tags, true);

      expect(storageClearSpy).not.toBeCalled();
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should clear cache on invalidation',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const storageClearSpy = vi.spyOn(manager.storage, 'clear');
      await queryHandler(manager, queryName, endpoint, params);

      manager.emit('invalidate', tags);

      expect(storageClearSpy).toBeCalledWith(queryName, params);
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
  ])(
    'should emit invalidatedQuery event on invalidation',
    async (expectedResult, queryName, params, tags) => {
      const endpoint: cachejs.Endpoint<
        'query',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'query',
        tags: vi.fn().mockReturnValue(tags),
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const managerEmitSpy = vi.spyOn(manager, 'emit');
      await queryHandler(manager, queryName, endpoint, params);
      manager.emit('invalidate', tags);

      expect(managerEmitSpy).toBeCalledWith(
        'invalidatedQuery',
        queryName,
        params,
        expectedResult,
        tags
      );
    }
  );
});

describe('standard mutation handler', () => {
  const {
    handlers: { mutation: mutationHandler },
    GenericCacheManager,
  } = cachejs;

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should call endpoint.request',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'mutation',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'mutation',
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const spyRequest = vi.spyOn(endpoint, 'request');

      await mutationHandler(manager, queryName, endpoint, params);

      expect(spyRequest).toHaveBeenCalledWith(...params);
    }
  );

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should return endpoint.request result',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'mutation',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'mutation',
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const result = await mutationHandler(
        manager,
        queryName,
        endpoint,
        params
      );

      expect(result).toBe(expectedResult);
    }
  );

  it.prop([fc.anything(), fc.string(), fc.array(fc.anything())])(
    'should store the result if there is an cache entry',
    async (expectedResult, queryName, params) => {
      const endpoint: cachejs.Endpoint<
        'mutation',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'mutation',
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });
      manager.storage.set(queryName, params, expectedResult);
      const spyRequest = vi.spyOn(endpoint, 'request');

      await mutationHandler(manager, queryName, endpoint, params);

      expect(spyRequest).toHaveBeenCalledWith(...params);
    }
  );

  it.prop([
    fc.anything(),
    fc.string(),
    fc.array(fc.anything()),
    fc.array(fc.string(), { size: 'xsmall', minLength: 1 }),
    fc.option(fc.boolean(), { nil: undefined }),
  ])(
    'should invalidate tags',
    async (expectedResult, queryName, params, tags, noClearOnInvalidate) => {
      const endpoint: cachejs.Endpoint<
        'mutation',
        (...args: unknown[]) => Promise<unknown>
      > = {
        request: vi.fn().mockResolvedValue(expectedResult),
        type: 'mutation',
        tags: vi.fn().mockReturnValue(tags),
        noClearOnInvalidate,
      };
      const manager = new GenericCacheManager({ [queryName]: endpoint });

      const managerEmitSpy = vi.spyOn(manager, 'emit');
      await mutationHandler(manager, queryName, endpoint, params);

      expect(managerEmitSpy).toBeCalledWith(
        'invalidate',
        tags,
        noClearOnInvalidate
      );
    }
  );
});

describe('cache manager', () => {
  const { CacheManager, GenericQueryStorage } = cachejs;

  it.prop([fc.string()])(
    'should register a handler correctly',
    (handlerName) => {
      const handlers = {} as any;
      const cacheManager = new CacheManager(
        new GenericQueryStorage(),
        handlers,
        {} as any
      );
      const handlerMock = vi.fn();
      cacheManager.registerHandler(handlerName, handlerMock);

      expect(handlers[handlerName]).toBe(handlerMock);
    }
  );

  it.prop([fc.string()])(
    'should register a endpoint correctly',
    (endpointName) => {
      const endpoints = {} as any;
      const cacheManager = new CacheManager(
        new GenericQueryStorage(),
        {} as any,
        endpoints
      );
      const endpointMock = { request: vi.fn() };
      cacheManager.register(endpointName, endpointMock);

      expect(endpoints[endpointName]).toBe(endpointMock);
    }
  );

  it.prop([fc.string(), fc.string(), fc.string(), fc.array(fc.anything())])(
    'should execute a query and return the correct result',
    async (expectedResult, handlerName, endpointName, params) => {
      const cacheManager = new CacheManager(
        new GenericQueryStorage(),
        {} as Record<string, any>,
        {} as Record<string, any>
      );
      const handlerMock = vi.fn().mockResolvedValue(expectedResult);
      cacheManager.registerHandler(handlerName, handlerMock);

      const endpointMock = { type: handlerName, request: vi.fn() };
      cacheManager.register(endpointName, endpointMock);

      const result = await cacheManager.execute(
        endpointName,
        endpointMock,
        params
      );

      expect(handlerMock).toHaveBeenCalledWith(
        cacheManager,
        endpointName,
        endpointMock,
        params
      );
      expect(result).toBe(expectedResult);
    }
  );

  it.prop([
    fc.string(),
    fc.string(),
    fc.string(),
    fc.array(fc.anything()),
    fc.boolean(),
  ])(
    'should execute an endpoint with options and return the correct result',
    async (
      expectedResult,
      handlerName,
      endpointName,
      params,
      noClearOnInvalidate
    ) => {
      const cacheManager = new CacheManager(
        new GenericQueryStorage(),
        {} as Record<string, any>,
        {} as Record<string, any>
      );
      const handlerMock = vi.fn().mockResolvedValue(expectedResult);
      cacheManager.registerHandler(handlerName, handlerMock);

      const endpointMock = { type: handlerName, request: vi.fn() };
      cacheManager.register(endpointName, endpointMock);

      const options = { noClearOnInvalidate };
      const result = await cacheManager.executeEndpoint(
        endpointName,
        params,
        options
      );

      expect(handlerMock).toHaveBeenCalledWith(
        cacheManager,
        endpointName,
        { ...endpointMock, ...options },
        params
      );
      expect(result).toBe(expectedResult);
    }
  );

  it.prop([
    fc.string(),
    fc.string(),
    fc.string(),
    fc.string(),
    fc.array(fc.anything()),
    fc.boolean(),
  ])(
    'should execute an optimistic request and return the correct result',
    async (
      expensiveResult,
      expectedResult,
      handlerName,
      endpointName,
      params,
      noClearOnInvalidate
    ) => {
      const cacheManager = new CacheManager(
        new GenericQueryStorage(),
        {} as Record<string, any>,
        {} as Record<string, any>
      );
      const optimisticRequestMock = vi.fn().mockReturnValue(expectedResult);
      const handlerMock = vi.fn().mockResolvedValue(expensiveResult);
      cacheManager.registerHandler(handlerName, handlerMock);

      const endpointMock = {
        type: handlerName,
        request: vi.fn().mockImplementation(async () => {
          while (true) {}
        }),
        optimisticRequest: optimisticRequestMock,
      };
      cacheManager.register(endpointName, endpointMock);

      const result = await cacheManager.execute(
        endpointName,
        endpointMock,
        params
      );

      expect(optimisticRequestMock).toHaveBeenCalledWith(
        cacheManager.storage,
        ...params
      );
      expect(handlerMock).toHaveBeenCalledWith(
        cacheManager,
        endpointName,
        endpointMock,
        params
      );
      expect(result).toBe(expectedResult);
    }
  );
});

const policyRespectsParentStorage = (policy) => {
  it.prop([fc.string(), fc.array(fc.anything()), fc.boolean()])(
    'has is called on internal storage',
    (queryKey, queryParams, hasValue) => {
      const storageMock = {
        has: vi.fn().mockReturnValue(hasValue),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = policy(storageMock);

      const result = cache.has(queryKey, queryParams);

      expect(result).toBe(hasValue);
      expect(storageMock.has).toHaveBeenCalledWith(queryKey, queryParams);
    }
  );

  it.prop([fc.string(), fc.anything(), fc.array(fc.anything())])(
    'get returns the value associated with the key from storage',
    (queryKey, queryValue, queryParams) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn().mockReturnValue(queryValue),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = policy(storageMock);

      const result = cache.get(queryKey, queryParams);

      expect(result).toBe(queryValue);
      expect(storageMock.get).toHaveBeenCalledWith(queryKey, queryParams);
    }
  );

  it.prop([fc.string(), fc.anything(), fc.array(fc.anything())])(
    'set adds the key-value pair to storage',
    (queryKey, queryValue, queryParams) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = policy(storageMock);

      cache.set(queryKey, queryParams, queryValue);

      expect(storageMock.set).toHaveBeenCalledWith(
        queryKey,
        queryParams,
        queryValue
      );
    }
  );

  it.prop([fc.string(), fc.array(fc.anything())])(
    'clear removes the key-value pair from storage',
    (queryKey, queryParams) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = policy(storageMock);

      cache.clear(queryKey, queryParams);

      expect(storageMock.clear).toHaveBeenCalledWith(queryKey, queryParams);
    }
  );
};

const truncatingPolicyRespectsParentStorage = (policy) => {
  policyRespectsParentStorage(policy);

  it.prop([
    fc.dictionary(fc.string(), fc.anything()),
    fc.nat(),
    fc.constant([]),
  ])(
    'truncate removes the specified number of entries from storage',
    (dict, count, params) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = policy(storageMock);

      for (const key in dict) {
        cache.set(key, params, dict[key]);
      }
      const initCount = storageMock.set.mock.calls.length;

      cache.truncate(count);

      expect(storageMock.clear).toHaveBeenCalledTimes(
        Math.max(0, Math.min(initCount, count))
      );
    }
  );
};

describe('fifo policy', () => {
  const { fifoPolicy } = cachejs;

  truncatingPolicyRespectsParentStorage(fifoPolicy);

  it.prop([
    fc.dictionary(fc.string(), fc.nat(), { minKeys: 1 }),
    fc.array(fc.anything()),
    fc.nat(),
  ])('truncate removes items in order of appearence', (dict, params, count) => {
    const storageMock = {
      has: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    };
    const cache = fifoPolicy(storageMock);
    let keys: string[] = [];

    for (const key in dict) {
      cache.set(key, params, dict[key]);
      keys.push(key);
    }

    cache.truncate(count);

    let n = 0;
    for (const key of keys.slice(0, count)) {
      n++;
      expect(storageMock.clear).toHaveBeenNthCalledWith(n, key, params);
    }
  });

  it.prop([
    fc.string(),
    fc.array(fc.anything()),
    fc.string(),
    fc.array(fc.anything()),
  ])(
    'resetting key does not change priority for truncation',
    (key1, params1, key2, params2) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };
      const cache = fifoPolicy(storageMock);

      cache.set(key1, params1, {});
      cache.set(key2, params2, {});
      cache.set(key1, params1, {});

      cache.truncate(1);

      expect(storageMock.clear).toBeCalledWith(key1, params1);
    }
  );
});

describe('lru policy', () => {
  const { lruPolicy } = cachejs;

  truncatingPolicyRespectsParentStorage(lruPolicy);

  it.prop([
    fc.anything(),
    fc.dictionary(fc.string(), fc.nat(), { maxKeys: 3, minKeys: 3 }),
  ])(
    'truncate removes the least recently used items from cache and storage',
    (params, dict) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cache = lruPolicy(storageMock);
      const [queryKey1, queryKey2, queryKey3] = Object.keys(dict);
      const keys = [queryKey1, queryKey2, queryKey3];

      for (const key of keys) {
        cache.set(key, params, dict[key]);
      }

      cache.get(queryKey1, params);
      cache.get(queryKey2, params);
      cache.get(queryKey3, params);

      cache.get(queryKey2, params);

      cache.truncate(2);

      // Assert storage clear calls
      expect(storageMock.clear).toHaveBeenCalledTimes(2);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey1, params);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey3, params);
    }
  );
});

describe('lfu policy', () => {
  const { lfuPolicy } = cachejs;

  truncatingPolicyRespectsParentStorage(lfuPolicy);

  it.prop([
    fc.anything(),
    fc.dictionary(fc.string(), fc.nat(), { maxKeys: 3, minKeys: 3 }),
  ])(
    'truncate removes the least recently used items from cache and storage',
    (params, dict) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cache = lfuPolicy(storageMock);
      const [queryKey1, queryKey2, queryKey3] = Object.keys(dict);
      const keys = [queryKey1, queryKey2, queryKey3];

      for (const key of keys) {
        cache.set(key, params, dict[key]);
      }

      cache.get(queryKey1, params);
      cache.get(queryKey2, params);
      cache.get(queryKey3, params);
      cache.get(queryKey1, params);
      cache.get(queryKey1, params);
      cache.get(queryKey2, params);

      cache.truncate(2);

      // Assert storage clear calls
      expect(storageMock.clear).toHaveBeenCalledTimes(2);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey3, params);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey2, params);
    }
  );
});

describe('mru policy', () => {
  const { mruPolicy } = cachejs;

  truncatingPolicyRespectsParentStorage(mruPolicy);

  it.prop([
    fc.anything(),
    fc.dictionary(fc.string(), fc.nat(), { maxKeys: 3, minKeys: 3 }),
  ])(
    'truncate removes the least recently used items from cache and storage',
    (params, dict) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cache = mruPolicy(storageMock);
      const [queryKey1, queryKey2, queryKey3] = Object.keys(dict);
      const keys = [queryKey1, queryKey2, queryKey3];

      for (const key of keys) {
        cache.set(key, params, dict[key]);
      }

      cache.get(queryKey1, params);
      cache.get(queryKey2, params);
      cache.get(queryKey3, params);

      cache.get(queryKey2, params);

      cache.truncate(2);

      // Assert storage clear calls
      expect(storageMock.clear).toHaveBeenCalledTimes(2);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey2, params);
      expect(storageMock.clear).toHaveBeenCalledWith(queryKey3, params);
    }
  );
});

describe('ttl policy', () => {
  const { ttlPolicy } = cachejs;

  policyRespectsParentStorage(ttlPolicy);

  it.prop([
    fc.nat().filter((x) => x > 1),
    fc.string(),
    fc.anything(),
    fc.anything(),
  ])('set creates timeout', (ttl, queryKey, queryValue, queryParams) => {
    const storageMock = {
      has: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    };

    const cache = ttlPolicy(storageMock, { ttl });
    vi.useFakeTimers();
    vi.clearAllTimers();

    cache.set(queryKey, queryParams, queryValue);

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(ttl - 1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.prop([
    fc.nat().filter((x) => x > 1),
    fc.string(),
    fc.anything(),
    fc.array(fc.anything()),
  ])(
    'get does not reset timeout on resets',
    (ttl, queryKey, queryValue, queryParams) => {
      const storageMock = {
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cache = ttlPolicy(storageMock, { ttl });
      vi.useFakeTimers();
      vi.clearAllTimers();

      cache.set(queryKey, queryParams, queryValue);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(ttl - 1);

      cache.get(queryKey, queryParams);
      vi.advanceTimersByTime(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.prop([
    fc.nat().filter((x) => x > 5),
    fc.string(),
    fc.anything(),
    fc.array(fc.anything()),
  ])(
    'updates TTL when debounce option is enabled',
    (ttl, queryKey, queryValue, queryParams) => {
      const storageMock = {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cache = ttlPolicy(storageMock, { ttl, debounce: true });
      vi.useFakeTimers();
      vi.clearAllTimers();

      cache.set(queryKey, queryParams, queryValue);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(ttl - 5);

      cache.get(queryKey, queryParams);
      vi.advanceTimersByTime(5);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(ttl - 5);
      expect(vi.getTimerCount()).toBe(0);
    }
  );
});
