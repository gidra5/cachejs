export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg ?? 'assertion failed');
  }
}

export const throttle = (time: number, f: () => void) => {
  let timeout: NodeJS.Timeout | null = null;
  const fn = () => {
    f();
    timeout = null;
  };

  return () => {
    if (timeout) return;
    timeout = setTimeout(fn, time);
  };
};
