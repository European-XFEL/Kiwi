import React from 'react';
import { GRAPH_LAYOUT } from '../constants';

export function ChartPlot({
  view,
  testId,
  title,
  legend,
  empty,
}: {
  view: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    selectionRef: React.RefObject<HTMLDivElement | null>;
    yAxisWidth?: number;
  };
  testId:
    | 'trend-chart'
    | 'vector-chart'
    | 'vector-xy-chart'
    | 'scatter-chart'
    | 'vector-scatter-chart';
  title: string;
  legend?: React.ReactNode;
  empty?: string;
}) {
  const container = view.containerRef;
  const selection = view.selectionRef;
  const yAxisWidth = view.yAxisWidth ?? GRAPH_LAYOUT.yAxisSize.untitled;
  const selectionId = testId.replace('-chart', '-zoom-selection');
  return (
    <div className="relative h-full min-h-0 min-w-0 flex-1">
      <div
        ref={container}
        data-testid={testId}
        className="relative h-full w-full min-w-0"
      />
      {title && (
        <div className="pointer-events-none absolute inset-x-0 top-0.5 text-center text-[13px] text-black">
          {title}
        </div>
      )}
      {legend && (
        <div
          className="absolute z-10"
          style={{ top: title ? 26 : 10, left: yAxisWidth + 8 }}
        >
          {legend}
        </div>
      )}
      <div
        ref={selection}
        data-testid={selectionId}
        className="pointer-events-none absolute hidden border border-slate-300 bg-slate-200/30"
      />
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-500">
          {empty}
        </div>
      )}
    </div>
  );
}
