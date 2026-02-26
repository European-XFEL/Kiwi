import React from 'react';

export type FitMode = 'fit-page' | 'fit-width' | 'fit-height' | 'actual';

/** Width and height of any rectangular content to be scaled. */
export type Dimensions = { width: number; height: number } | null;

/**
 * Observes the container size and returns a CSS scale factor for the content.
 *
 * Re-calculates whenever the container is resized, the dimensions change,
 * or the fit mode changes.
 */
export function useSceneScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  dimensions: Dimensions,
  fitMode: FitMode
): number {
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !dimensions) return;

      // How much space the container currently offers
      const { width: containerWidth, height: containerHeight } =
        containerRef.current.getBoundingClientRect();

      // Authored dimensions of the scene (fixed at design time)
      const sceneWidth = dimensions.width;
      const sceneHeight = dimensions.height;

      if (
        sceneWidth <= 0 ||
        sceneHeight <= 0 ||
        containerWidth <= 0 ||
        containerHeight <= 0
      ) {
        setScale(1);
        return;
      }

      // Subtract a small gutter so the scene never touches the container edges
      const availableWidth = Math.max(containerWidth - 8, 0);
      const availableHeight = Math.max(containerHeight - 8, 0);

      let newScale: number;

      switch (fitMode) {
        case 'fit-page':
          // Scale down until BOTH axes fit — scene is fully visible, no scroll needed
          newScale = Math.min(
            availableWidth / sceneWidth,
            availableHeight / sceneHeight,
            1
          );
          break;

        case 'fit-width':
          // Scale to fill the full width — height may overflow (user scrolls vertically)
          newScale = Math.min(availableWidth / sceneWidth, 1);
          break;

        case 'fit-height':
          // Scale to fill the full height — width may overflow (user scrolls horizontally)
          newScale = Math.min(availableHeight / sceneHeight, 1);
          break;

        case 'actual':
          // No scaling — render at 100%, scroll in any direction as needed
          newScale = 1;
          break;
      }

      setScale(Number.isFinite(newScale) ? newScale : 1);
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [dimensions, fitMode, containerRef]);

  return scale;
}
