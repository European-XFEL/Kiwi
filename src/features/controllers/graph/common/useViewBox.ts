import React from 'react';
import type { ChartMouseTool } from './components/ChartToolBar';
import { useMouseGestures, type AxisRanges } from './useMouseGestures';
import type { Range } from './constants';
import type { PlotViewport } from './usePlotItem';

type ViewBoxArgs = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectionRef: React.RefObject<HTMLDivElement | null>;
  viewport: PlotViewport;
  inverted: { x: boolean; y: boolean };
  logarithmicX: boolean;
  logarithmicY: boolean;
  onComplete: (x: Range, y: Range) => void;
  onFinish: (ranges?: AxisRanges) => void;
  onReset: () => void;
};

export type ViewBox = {
  tool: ChartMouseTool;
  selectTool: (tool: ChartMouseTool) => void;
  reset: () => void;
  rangesRef: React.RefObject<AxisRanges | undefined>;
  activeRef: React.RefObject<boolean>;
};

/**
 * Owns the selected mouse tool and the current ranges during navigation.
 * Connects shared gestures to the plot viewport and graph-specific callbacks.
 */
export function useViewBox({
  containerRef,
  selectionRef,
  viewport,
  inverted,
  logarithmicX,
  logarithmicY,
  onComplete,
  onFinish,
  onReset,
}: ViewBoxArgs): ViewBox {
  const [tool, setTool] = React.useState<ChartMouseTool>('pointer');
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);
  const activeRef = React.useRef(false);

  const getRanges = React.useCallback(() => rangesRef.current, []);
  const setRanges = React.useCallback(
    (ranges: AxisRanges) => {
      rangesRef.current = ranges;
      viewport.setRanges(ranges);
    },
    [viewport]
  );
  const selectTool = React.useCallback(
    (next: ChartMouseTool) =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );
  const finish = React.useCallback(
    () => onFinish(rangesRef.current),
    [onFinish]
  );

  useMouseGestures({
    containerRef,
    selectionRef,
    viewport,
    tool,
    inverted,
    logarithmicX,
    logarithmicY,
    activeRef,
    getRanges,
    setRanges,
    complete: onComplete,
    finish,
    reset: onReset,
  });

  return { tool, selectTool, reset: onReset, rangesRef, activeRef };
}
