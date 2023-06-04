import {
  DependencyList,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type PromiseType<P extends Promise<any>> = P extends Promise<infer T>
  ? T
  : never;

export type AsyncFunction = (...args: any[]) => Promise<any>;

export type AsyncState<T> =
  | { loading: boolean }
  | { loading: false; error: Error }
  | { loading: false; value: T };

type StateFromAsyncFunction<T extends AsyncFunction> = AsyncState<
  PromiseType<ReturnType<T>>
>;

export type AsyncFnReturn<T extends AsyncFunction = AsyncFunction> = [
  StateFromAsyncFunction<T>,
  T
];

export function useAsyncFn<T extends AsyncFunction>(
  fn: T,
  deps: DependencyList = [],
  initialState: StateFromAsyncFunction<T> = { loading: false }
): AsyncFnReturn<T> {
  const lastCallId = useRef(0);
  const isMountedRef = useRef<boolean>(false);
  const [state, set] = useState<StateFromAsyncFunction<T>>(initialState);

  const callback = useCallback((...args: Parameters<T>): ReturnType<T> => {
    const callId = ++lastCallId.current;

    if (!state.loading) {
      set((prevState) => ({ ...prevState, loading: true }));
    }

    return fn(...args).then(
      (value) => {
        if (isMountedRef.current && callId === lastCallId.current)
          set({ value, loading: false });

        return value;
      },
      (error) => {
        if (isMountedRef.current && callId === lastCallId.current)
          set({ error, loading: false });

        return error;
      }
    ) as ReturnType<T>;
  }, deps);

  useEffect(() => {
    isMountedRef.current = true;

    return () => void (isMountedRef.current = false);
  }, []);

  return [state, callback as unknown as T];
}

export function useAsync<T extends AsyncFunction>(
  fn: T,
  deps: DependencyList = []
) {
  const [state, callback] = useAsyncFn(fn, deps, {
    loading: true,
  });

  useEffect(() => {
    callback();
  }, [callback]);

  return state;
}
