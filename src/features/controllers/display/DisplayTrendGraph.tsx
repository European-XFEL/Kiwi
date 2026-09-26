import React from 'react';
import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import { useTrendModel, type TrendSeries } from '../graph/useTrendModel';
import { useTrendChart } from '../graph/useTrendChart';
import { formatTrendTime, TRACE_COLORS } from '../graph/configTrendChart';
import { GraphToolbar } from '../graph/GraphToolbar';

const TIME_PRESETS = [
  { mode: 'week', label: 'One Week' },
  { mode: 'day', label: 'One Day' },
  { mode: 'hour', label: 'One Hour' },
  { mode: 'tenMinutes', label: 'Ten Minutes' },
  { mode: 'uptime', label: 'Uptime' },
] as const;

type TrendView = ReturnType<typeof useTrendChart>;

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
  series,
  title,
  hiddenCurves,
  toggleCurve,
  containerRef,
  selectionRef,
}: {
  series: TrendSeries[];
  title: string;
  hiddenCurves: TrendView['hiddenCurves'];
  toggleCurve: TrendView['toggleCurve'];
  containerRef: TrendView['containerRef'];
  selectionRef: TrendView['selectionRef'];
}) {
  return (
    <div className="relative h-full min-h-0 min-w-0 flex-1">
      <div
        ref={containerRef}
        data-testid="trend-chart"
        className="relative h-full w-full min-w-0"
      />
      {title && (
        <div className="pointer-events-none absolute inset-x-0 top-0.5 text-center text-[13px] text-black">
          {title}
        </div>
      )}
      {series.length > 1 && (
        <div
          className="absolute left-[60px] z-10 flex flex-col gap-1 rounded-sm border border-black bg-slate-200/20 p-1 text-xs text-black"
          style={{ top: title ? 26 : 10 }}
          aria-label="Graph legend"
        >
          {series.map((item, index) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={!hiddenCurves.has(item.key)}
              onClick={() => toggleCurve(item.key)}
              className="flex items-center gap-1"
              style={{ opacity: hiddenCurves.has(item.key) ? 0.4 : 1 }}
            >
              <span
                className="inline-block h-3 w-3"
                style={{
                  backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length],
                }}
              />
              {item.key}
            </button>
          ))}
        </div>
      )}
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
  const published = useTrendModel(ctx.proxies, model.keys);
  return <TrendPlot model={model} {...published} />;
}

const TrendPlot = React.memo(function TrendPlot({
  model,
  series,
  startTime,
  dataRevision,
}: { model: DisplayTrendGraphModel } & ReturnType<typeof useTrendModel>) {
  const view = useTrendChart({ model, series, startTime, dataRevision });
  return (
    <div
      className="flex h-full w-full min-w-0 flex-col gap-0.5"
      style={{ backgroundColor: model.background }}
    >
      <div className="flex min-h-0 flex-1">
        <TrendChart
          series={series}
          title={model.title}
          hiddenCurves={view.hiddenCurves}
          toggleCurve={view.toggleCurve}
          containerRef={view.containerRef}
          selectionRef={view.selectionRef}
        />
        <GraphToolbar
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
