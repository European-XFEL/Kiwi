import { useEffect, useMemo, useRef } from "react";
import { throttle, DebouncedFunc } from "lodash";

export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunc<T> => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttled = useMemo(() => {
    const wrapper = (...args: Parameters<T>): void => {
      callbackRef.current(...args);
    };
    return throttle(wrapper, delay);
  }, [delay]);

  useEffect(() => {
    return () => throttled.cancel();
  }, [throttled]);

  return throttled as unknown as DebouncedFunc<T>;
};
