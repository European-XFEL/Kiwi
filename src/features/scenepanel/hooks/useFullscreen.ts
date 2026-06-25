import React from 'react';

export interface FullscreenControls {
  // Whether the target element is currently the fullscreen element.
  isFullscreen: boolean;
  // Whether the browser allows fullscreen at all (feature/permission gate).
  supported: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

/**
 * Drives the native Fullscreen API for a single element. Stands on its own:
 * it owns no scene/fit state, only the browser fullscreen of the given ref.
 */
export function useFullscreen(
  ref: React.RefObject<HTMLElement | null>
): FullscreenControls {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const supported =
    typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  React.useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === ref.current);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, [ref]);

  const enter = React.useCallback(() => {
    const element = ref.current;
    if (element && !document.fullscreenElement) {
      void element.requestFullscreen?.();
    }
  }, [ref]);

  const exit = React.useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    }
  }, []);

  const toggle = React.useCallback(() => {
    if (document.fullscreenElement === ref.current) {
      exit();
    } else {
      enter();
    }
  }, [ref, enter, exit]);

  return { isFullscreen, supported, enter, exit, toggle };
}

export default useFullscreen;
