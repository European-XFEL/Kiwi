import React from 'react';
import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import pointerIcon from '@/assets/icons/general/pointer.svg?url';
import zoomIcon from '@/assets/icons/general/zoom.svg?url';
import moveIcon from '@/assets/icons/general/move.svg?url';
import resetIcon from '@/assets/icons/general/reset.svg?url';
import {
  useDisplayTrendGraph,
  type TrendSeries,
} from '../../hooks/useDisplayTrendGraph';
import { useTrendGraphView } from '../../hooks/useTrendGraphView';
import { useTrendChart } from '../../hooks/useTrendChart';
import { formatTrendTime } from '../../hooks/trendChartConfig';

const MOUSE_TOOLS = [
  { tool: 'pointer', label: 'Pointer', icon: pointerIcon },
  { tool: 'zoom', label: 'Zoom', icon: zoomIcon },
  { tool: 'pan', label: 'Move', icon: moveIcon },
] as const;
const TIME_PRESETS = [
  { mode: 'week', label: 'One Week' },
  { mode: 'day', label: 'One Day' },
  { mode: 'hour', label: 'One Hour' },
  { mode: 'tenMinutes', label: 'Ten Minutes' },
  { mode: 'uptime', label: 'Uptime' },
] as const;

type TrendView = ReturnType<typeof useTrendGraphView>;

const TrendToolbar = React.memo(function TrendToolbar({
  tool: selectedTool,
  selectTool,
  reset,
}: Pick<TrendView, 'tool' | 'selectTool' | 'reset'>) {
  const controls = [
    ...MOUSE_TOOLS.map(({ tool, label, icon }) => ({
      label,
      icon,
      checked: selectedTool === tool,
      onClick: () => selectTool(tool),
    })),
    {
      label: 'Reset view',
      icon: resetIcon,
      checked: undefined,
      onClick: reset,
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Trend graph controls"
      className="flex w-8 shrink-0 flex-col items-center bg-transparent"
    >
      {controls.map(({ label, icon, checked, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          data-testid={label === 'Reset view' ? 'trend-reset-view' : undefined}
          aria-label={label}
          title={label}
          aria-pressed={checked}
          className="h-7 w-7 rounded-sm border border-transparent aria-pressed:border-slate-500 aria-pressed:bg-slate-200"
          onClick={onClick}
        >
          <img src={icon} alt="" className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
});

const TrendTimeControls = React.memo(function TrendTimeControls({
  visibleRange,
}: Pick<TrendView, 'visibleRange'>) {
  return (
    <div className="flex gap-0.5">
      {['Range start', 'Range end'].map((label, index) => (
        <input
          key={label}
          aria-label={label}
          readOnly
          value={visibleRange ? formatTrendTime(visibleRange[index]) : ''}
          className="h-5 min-w-0 flex-1 rounded-sm border border-slate-400 bg-white px-1 text-xs text-black"
        />
      ))}
    </div>
  );
});

const TrendTimePresets = React.memo(function TrendTimePresets({
  mode: selectedMode,
  follow,
}: Pick<TrendView, 'mode' | 'follow'>) {
  return (
    <div
      role="group"
      aria-label="Trend time range"
      className="flex flex-wrap gap-0.5"
    >
      {TIME_PRESETS.map(({ mode, label }) => (
        <Button
          key={mode}
          type="button"
          variant="outline"
          aria-pressed={selectedMode === mode}
          className="h-5 flex-1 rounded-sm border-slate-400 px-2 py-0 text-xs font-normal aria-pressed:border-slate-500 aria-pressed:bg-slate-200"
          onClick={() => follow(mode)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
});

function TrendChart({
  model,
  series,
  dataRevision,
  view,
}: {
  model: DisplayTrendGraphModel;
  series: TrendSeries[];
  dataRevision: number;
  view: TrendView;
}) {
  const { containerRef, selectionRef } = useTrendChart({
    model,
    series,
    dataRevision,
    view,
  });

  return (
    <div className="relative h-full min-h-0 min-w-0 flex-1">
      <div
        ref={containerRef}
        data-testid="trend-chart"
        className="h-full w-full"
      />
      <div
        ref={selectionRef}
        data-testid="trend-zoom-selection"
        className="pointer-events-none absolute hidden border border-slate-300 bg-slate-200/30"
      />
      {series.every((item) => item.values.length === 0) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-500">
          Waiting for data…
        </div>
      )}
    </div>
  );
}

function TrendGraph({
  model,
  ctx,
}: {
  model: DisplayTrendGraphModel;
  ctx: ControllerContainerContext;
}) {
  const published = useDisplayTrendGraph(ctx.proxies, model.keys);
  return <TrendPlot model={model} {...published} />;
}

const TrendPlot = React.memo(function TrendPlot({
  model,
  series,
  startTime,
  dataRevision,
}: { model: DisplayTrendGraphModel } & ReturnType<
  typeof useDisplayTrendGraph
>) {
  const view = useTrendGraphView(startTime, series);
  return (
    <div
      className="flex h-full w-full min-w-0 flex-col gap-0.5"
      style={{ backgroundColor: model.background }}
    >
      <div className="flex min-h-0 flex-1">
        <TrendChart
          model={model}
          series={series}
          dataRevision={dataRevision}
          view={view}
        />
        <TrendToolbar
          tool={view.tool}
          selectTool={view.selectTool}
          reset={view.reset}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <TrendTimeControls visibleRange={view.visibleRange} />
        <TrendTimePresets mode={view.mode} follow={view.follow} />
      </div>
    </div>
  );
});

const DisplayTrendGraph = React.memo(
  ({
    model,
    ctx,
  }: {
    model: DisplayTrendGraphModel;
    ctx?: ControllerContainerContext;
  }) => (ctx ? <TrendGraph model={model} ctx={ctx} /> : null)
);

DisplayTrendGraph.displayName = 'DisplayTrendGraph';
export default DisplayTrendGraph;
