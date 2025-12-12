import { debounce, DebouncedFunc } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';

export const useDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): DebouncedFunc<(...args: Parameters<T>) => void> => {
  const callbackRef = useRef(callback);

  // Keep ref up to date with the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create the debounced function once per delay
  const debouncedCallback = useMemo(() => {
    const fn = (...args: Parameters<T>) => {
      callbackRef.current(...args);
    };

    return debounce(fn, delay);
  }, [delay]);

  return debouncedCallback;
};
