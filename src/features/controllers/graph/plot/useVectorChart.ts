import React from 'react';
import type { PlotSettings } from '../common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { lttbWithCoordinates } from '../../utils/lttb';
import { BAR_SAMPLE_LIMIT, barChartOption } from './configBarChart';
import {
  fixedVectorRange,
  visibleVectorRange,
  vectorPoints,
} from './vectorRange';
import {
  chooseVectorTargetPoints,
  VECTOR_POINT_LIMIT,
  vectorChartOption,
} from './configVectorChart';
import {
  GRAPH_LAYOUT,
  usePlotItem,
  useViewBox,
  type AxisRanges,
} from '../common/api';
import { useVectorData } from './useVectorData';

/**
 * Coordinates vector and bar plots: selects the chart configuration, samples
 * visible data, and applies navigation ranges to the shared Chart.js plot.
 */
export function useVectorChart({
  plotConfig,
  proxy,
}: {
  plotConfig: PlotSettings;
  proxy: PropertyProxy | undefined;
}) {
  const isBar = 'bar_width' in plotConfig;
  const logarithmicX = !isBar && plotConfig.x_log;
  const { values } = useVectorData(proxy);
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
    () => (isBar ? barChartOption(plotConfig) : vectorChartOption(plotConfig)),
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
      const [start, end] = visibleVectorRange(
        values.length,
        xRange,
        logarithmicX,
        isBar ? undefined : plotConfig
      );
      const visiblePoints = lttbWithCoordinates(
        values,
        isBar
          ? Math.min(BAR_SAMPLE_LIMIT, end - start)
          : chooseVectorTargetPoints(end - start),
        {
          start,
          end,
          offset: isBar ? 0 : plotConfig.offset,
          step: isBar ? 1 : plotConfig.step,
        }
      );
      const pointRadius =
        !isBar && visiblePoints.length / 2 < VECTOR_POINT_LIMIT
          ? GRAPH_LAYOUT.vectorPointSize
          : 0;
      update(
        [{ data: vectorPoints(visiblePoints) }],
        xRange,
        yRange,
        pointRadius
      );
      viewBox.rangesRef.current = viewport.readRanges(
        xRange && yRange ? { x: xRange, y: yRange } : viewBox.rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [
      plotConfig,
      values,
      ranges,
      viewBox.rangesRef,
      isBar,
      logarithmicX,
      update,
      viewport,
    ]
  );

  React.useLayoutEffect(() => {
    if (viewBox.activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, revision, viewBox.activeRef]);

  return {
    containerRef,
    selectionRef,
    tool: viewBox.tool,
    selectTool: viewBox.selectTool,
    reset: viewBox.reset,
  };
}
