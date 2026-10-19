import { type PlotSettings } from '@/karabo/common/api';
import { useLayoutEffect, useMemo } from 'react';

import {
  ImageBinding,
  ProxyStatus,
  type PropertyProxy,
} from '@/lib/binding/api';
import { hasImageData } from './pixels';
import { readImageSource } from './raster';
import { useImageItem } from './useImageItem';
import { useImageViewBox } from './useImageViewBox';

/** Decodes source updates for the image item and viewbox. */
export function useImageGraphView({
  proxy,
  plotConfig,
  imageOnly = false,
}: {
  proxy: PropertyProxy | undefined;
  plotConfig: PlotSettings;
  imageOnly?: boolean;
}) {
  const binding = proxy?.binding;
  const timestamp = binding?.timestamp;
  const offline = proxy?.root.status === ProxyStatus.OFFLINE;
  // Decoding creates a source wrapper. Preserve its identity until the binding updates
  // so unchanged renders neither resample contrast limits nor publish another frame.
  const source = useMemo(() => {
    if (offline || !(binding instanceof ImageBinding)) {
      return undefined;
    }
    return readImageSource(binding);
    // Parent timestamps advance after all nested image fields are configured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxy, binding, timestamp, offline]);
  let placeholder: string | undefined;
  if (!source) {
    placeholder = 'Image';
    // A binding can exist before its first payload; only populated failures are unsupported.
    if (binding instanceof ImageBinding && hasImageData(binding) && !offline) {
      placeholder = 'Unsupported Encoding';
    }
  }
  // Own the Konva drawing resources and expose the shared frame scheduler.
  const { containerRef, stageRef, overlayRef, publish, requestDraw } =
    useImageItem();
  // Separate binding replacement from ordinary frame updates when resetting navigation.
  const identity = useMemo(() => ({ proxy, binding }), [proxy, binding]);
  // Connect decoded source geometry and config to renderer-independent navigation.
  const { selectionRef, viewport, readView, tool, selectTool, reset } =
    useImageViewBox({
      containerRef,
      source,
      plotConfig,
      imageOnly,
      identity,
      requestDraw,
    });

  // Publish changed source, settings, and placeholder state before the scheduled canvas draw.
  useLayoutEffect(() => {
    publish({ source, plotConfig, placeholder, imageOnly, readView });
    // Config snapshots may change on rerender; publish only when a displayed setting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    publish,
    source,
    plotConfig.colormap,
    plotConfig.x_label,
    plotConfig.y_label,
    plotConfig.x_units,
    plotConfig.y_units,
    plotConfig.x_scale,
    plotConfig.y_scale,
    plotConfig.x_translate,
    plotConfig.y_translate,
    plotConfig.aspect_ratio,
    plotConfig.show_scale,
    plotConfig.color_levels,
    placeholder,
    imageOnly,
    readView,
  ]);

  return {
    containerRef,
    overlayRef,
    stageRef,
    selectionRef,
    viewport,
    tool,
    selectTool,
    reset,
  };
}
