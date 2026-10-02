import React from 'react';
import { buildModelConfig, type PlotSettings } from '../graph/common/api';
import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import {
  formatTrendTime,
  useTrendChart,
  useTrendModel,
} from '../graph/trend/api';
import { ChartLayout, ChartPlot, TRACE_COLORS } from '../graph/common/api';

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

function TrendGraph({
  model,
  ctx,
}: {
  model: DisplayTrendGraphModel;
  ctx: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const published = useTrendModel(ctx.proxies, model.keys);
  return <TrendPlot plotConfig={plotConfig} {...published} />;
}

const TrendPlot = React.memo(function TrendPlot({
  plotConfig,
  series,
  startTime,
  dataRevision,
}: { plotConfig: PlotSettings } & ReturnType<typeof useTrendModel>) {
  const view = useTrendChart({ plotConfig, series, startTime, dataRevision });
  return (
    <ChartLayout
      background={plotConfig.background}
      viewBox={{
        tool: view.tool,
        selectTool: view.selectTool,
        reset: view.reset,
      }}
      footer={
        <>
          <TrendTimeControls visibleRange={view.visibleRange} />
          <TrendTimePresets mode={view.mode} follow={view.follow} />
        </>
      }
    >
      <ChartPlot
        containerRef={view.containerRef}
        selectionRef={view.selectionRef}
        testId="trend-chart"
        title={plotConfig.title}
        empty={
          series.every((item) => item.values.length === 0)
            ? 'Waiting for data…'
            : undefined
        }
        legend={
          series.length > 1 && (
            <div
              className="absolute left-[60px] z-10 flex flex-col gap-1 rounded-sm border border-black bg-slate-200/20 p-1 text-xs text-black"
              style={{ top: plotConfig.title ? 26 : 10 }}
              aria-label="Graph legend"
            >
              {series.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={!view.hiddenCurves.has(item.key)}
                  onClick={() => view.toggleCurve(item.key)}
                  className="flex items-center gap-1"
                  style={{ opacity: view.hiddenCurves.has(item.key) ? 0.4 : 1 }}
                >
                  <span
                    className="inline-block h-3 w-3"
                    style={{
                      backgroundColor:
                        TRACE_COLORS[index % TRACE_COLORS.length],
                    }}
                  />
                  {item.key}
                </button>
              ))}
            </div>
          )
        }
      />
    </ChartLayout>
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
