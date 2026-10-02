import * as React from 'react';

// Body portals are hidden behind the native fullscreen element's top layer.
export function useFullscreenContainer(): HTMLElement | null {
  const [element, setElement] = React.useState<HTMLElement | null>(() =>
    typeof document === 'undefined'
      ? null
      : ((document.fullscreenElement as HTMLElement | null) ?? null)
  );

  React.useEffect(() => {
    const sync = () =>
      setElement((document.fullscreenElement as HTMLElement | null) ?? null);

    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
    };
  }, []);

  return element;
}
