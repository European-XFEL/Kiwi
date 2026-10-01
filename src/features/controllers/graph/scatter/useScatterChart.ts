import React from 'react';
import type { PlotSettings } from '../common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { usePlotItem, useViewBox, type AxisRanges } from '../common/api';
import { fixedVectorRange } from '../plot/vectorRange';
import { scatterChartOption } from './configScatterChart';
import { useScatterData } from './useScatterData';

export function useScatterChart({
  plotConfig,
  proxies,
}: {
  plotConfig: PlotSettings;
  proxies: PropertyProxy[];
}) {
  const { points, dataRevision, clear } = useScatterData(
    proxies,
    plotConfig.maxlen
  );
  const logarithmicX = plotConfig.x_log;
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = React.useState<AxisRanges>();
  const [revision, setRevision] = React.useState(0);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const onFinish = React.useCallback((ranges?: AxisRanges) => {
    pendingUpdateRef.current?.(ranges);
  }, []);
  const pause = React.useCallback(
    (x: AxisRanges['x'], y: AxisRanges['y']) => setRanges({ x, y }),
    []
  );
  const reset = React.useCallback(() => {
    setRanges(undefined);
    setRevision((current) => current + 1);
  }, []);
  const plotItem = usePlotItem(
    () => scatterChartOption(plotConfig),
    [plotConfig]
  );
  const { containerRef, viewport, update } = plotItem;

  const viewBox = useViewBox({
    containerRef,
    selectionRef,
    viewport,
    inverted: { x: plotConfig.x_invert, y: plotConfig.y_invert },
    logarithmicX,
    logarithmicY: plotConfig.y_log,
    onComplete: pause,
    onFinish,
    onReset: reset,
  });

  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const xRange =
        gestureRanges?.x ??
        ranges?.x ??
        fixedVectorRange(
          plotConfig.x_autorange,
          plotConfig.x_min,
          plotConfig.x_max
        );
      const yRange =
        gestureRanges?.y ??
        ranges?.y ??
        fixedVectorRange(
          plotConfig.y_autorange,
          plotConfig.y_min,
          plotConfig.y_max
        );
      update([{ data: points }], xRange, yRange);
      viewBox.rangesRef.current = viewport.readRanges(
        xRange && yRange ? { x: xRange, y: yRange } : viewBox.rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [plotConfig, points, ranges, viewBox.rangesRef, update, viewport]
  );

  React.useLayoutEffect(() => {
    if (viewBox.activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, revision, dataRevision, viewBox.activeRef]);

  return {
    containerRef,
    selectionRef,
    tool: viewBox.tool,
    selectTool: viewBox.selectTool,
    reset: viewBox.reset,
    clear: () => {
      const current = viewport.readRanges();
      if (current) setRanges(current);
      clear();
    },
  };
}
