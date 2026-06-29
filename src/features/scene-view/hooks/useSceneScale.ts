import React from 'react';
import { computeScale } from '../utils/sceneLayout';

export type FitMode =
  'fit-page' | 'fit-screen' | 'fit-width' | 'fit-height' | 'actual';

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

    const recalculate = () => {
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

      const newScale = computeScale(
        fitMode,
        { width: availableWidth, height: availableHeight },
        { width: sceneWidth, height: sceneHeight }
      );

      setScale(Number.isFinite(newScale) ? newScale : 1);
    };

    const ro = new ResizeObserver(() => {
      recalculate();
    });

    ro.observe(containerRef.current);
    recalculate();
    return () => ro.disconnect();
  }, [dimensions?.width, dimensions?.height, fitMode, containerRef]);

  return scale;
}
