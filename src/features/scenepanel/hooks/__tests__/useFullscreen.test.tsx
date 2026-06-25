import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { useFullscreen } from '../useFullscreen';

describe('useFullscreen', () => {
  let element: HTMLDivElement;
  let ref: React.RefObject<HTMLElement | null>;
  let requestFullscreen: jest.Mock;
  let exitFullscreen: jest.Mock;
  let activeElement: Element | null;

  beforeEach(() => {
    element = document.createElement('div');
    ref = { current: element };
    activeElement = null;
    requestFullscreen = jest.fn().mockResolvedValue(undefined);
    exitFullscreen = jest.fn().mockResolvedValue(undefined);

    element.requestFullscreen = requestFullscreen;
    document.exitFullscreen = exitFullscreen;
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => activeElement,
    });
  });

  function enterNatively() {
    act(() => {
      activeElement = element;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  }

  it('reports supported when the browser allows fullscreen', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.supported).toBe(true);
  });

  it('requests fullscreen on the element when toggled on', () => {
    const { result } = renderHook(() => useFullscreen(ref));

    act(() => result.current.toggle());

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('tracks the active fullscreen element via fullscreenchange', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.isFullscreen).toBe(false);

    enterNatively();

    expect(result.current.isFullscreen).toBe(true);
  });

  it('exits fullscreen when toggled off while active', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    enterNatively();

    act(() => result.current.toggle());

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
