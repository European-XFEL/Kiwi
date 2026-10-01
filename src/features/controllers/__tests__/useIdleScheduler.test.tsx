import { act, renderHook } from '@testing-library/react';
import { useIdleScheduler } from '../useIdleScheduler';

describe('useIdleScheduler', () => {
  it('runs each callback immediately when requestIdleCallback is unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'requestIdleCallback'
    );
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: undefined,
    });

    try {
      const { result } = renderHook(() => useIdleScheduler(1000));
      const callback = jest.fn();

      act(() => {
        result.current(callback);
        result.current(callback);
      });

      expect(callback).toHaveBeenCalledTimes(2);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(
          window,
          'requestIdleCallback',
          originalDescriptor
        );
      } else {
        Reflect.deleteProperty(window, 'requestIdleCallback');
      }
    }
  });
});
