import React from 'react';
import type { ScatterGraphModel } from '@/karabo/common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { usePlotItem, useViewBox, type AxisRanges } from '../common/api';
import { fixedVectorRange } from '../plot/vectorRange';
import { scatterChartOption } from './configScatterChart';
import { useScatterData } from './useScatterData';

export function useScatterChart({
  model,
  proxies,
}: {
  model: ScatterGraphModel;
  proxies: PropertyProxy[];
}) {
  const { points, dataRevision, clear } = useScatterData(proxies, model.maxlen);
  const logarithmicX = model.x_log;
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
  const plotItem = usePlotItem(() => scatterChartOption(model), [model]);
  const { containerRef, viewport, update } = plotItem;

  const viewBox = useViewBox({
    containerRef,
    selectionRef,
    viewport,
    inverted: { x: model.x_invert, y: model.y_invert },
    logarithmicX,
    logarithmicY: model.y_log,
    onComplete: pause,
    onFinish,
    onReset: reset,
  });

  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const xRange =
        gestureRanges?.x ??
        ranges?.x ??
        fixedVectorRange(model.x_autorange, model.x_min, model.x_max);
      const yRange =
        gestureRanges?.y ??
        ranges?.y ??
        fixedVectorRange(model.y_autorange, model.y_min, model.y_max);
      update([{ data: points }], xRange, yRange);
      viewBox.rangesRef.current = viewport.readRanges(
        xRange && yRange ? { x: xRange, y: yRange } : viewBox.rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [model, points, ranges, viewBox.rangesRef, update, viewport]
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
