/** DisplayTrendGraph — rolling time-series chart using Plotly. */

import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { DisplayTrendGraphModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { useDisplayTrendGraph } from '@/features/scene-view/hooks/useDisplayTrendGraph';
import { TraceFactory } from '@/features/scene-view/utils/traceFactory';
import { buildTimeValueHeatmap } from '@/features/scene-view/utils/heatmapBining';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';

// DisplayTrendGraph
// ----------------------------------------------------------------------------

type ChartType = 'line' | 'scatter' | 'area' | 'bar' | 'heatmap';

const DisplayTrendGraph: React.FC<{
  model: DisplayTrendGraphModel;
  ctx?: ControllerContainerContext;
}> = React.memo(({ model, ctx }) => {
  const [chartType, setChartType] = React.useState<ChartType>('line');

  const { timestamps, values, isOffline } = useDisplayTrendGraph(ctx?.primary, {
    maxDataPoints: 1000,
    timeWindowMs: Infinity,
    throttleDelayMs: 500,
  });

  const noData = values.length === 0;

  const data = React.useMemo<Data[]>(() => {
    if (chartType === 'heatmap') {
      return [
        TraceFactory.heatmap({
          kind: 'heatmap',
          series: buildTimeValueHeatmap(timestamps, values, {
            timeBins: 24,
            valueBins: 10,
          }),
          name: 'Density',
        }),
      ];
    }

    const traceBuilders: Record<
      Exclude<ChartType, 'heatmap'>,
      keyof typeof TraceFactory
    > = {
      line: 'line',
      scatter: 'points',
      area: 'area',
      bar: 'bar',
    };

    const builderKey =
      traceBuilders[chartType as Exclude<ChartType, 'heatmap'>];
    const builder = TraceFactory[builderKey] as (input: any) => Data;

    return [
      builder({
        kind: 'xy',
        series: { x: timestamps, y: values },
        name: 'Series',
      }),
    ];
  }, [chartType, timestamps, values]);

  const layout = React.useMemo<Partial<Layout>>(() => {
    const isHeatmap = chartType === 'heatmap';
    return {
      autosize: true,
      margin: { t: 36, r: 12, b: 36, l: 44 },
      paper_bgcolor:
        model.background && model.background !== 'transparent'
          ? model.background
          : 'rgba(0,0,0,0)',
      plot_bgcolor:
        model.background && model.background !== 'transparent'
          ? model.background
          : 'rgba(0,0,0,0)',
      xaxis: {
        title: {
          text: isHeatmap ? 'Time bins' : model.x_label || 'Time',
          standoff: 8,
        },
        showgrid: !isHeatmap && model.x_grid,
        type: isHeatmap ? undefined : 'date',
        automargin: true,
      },
      yaxis: {
        title: {
          text: isHeatmap ? 'Value bins' : model.y_label || 'Value',
          standoff: 8,
        },
        showgrid: !isHeatmap && model.y_grid,
        automargin: true,
      },
      hovermode: isHeatmap ? 'closest' : 'x unified',
      showlegend: false,
    };
  }, [chartType, model]);

  if (isOffline || noData) {
    return (
      <div
        className="flex items-center justify-center w-full h-full border border-slate-200 bg-slate-50 text-xs text-slate-500 select-none"
        title={ctx?.tooltipText ?? ctx?.disabledReason}
      >
        {isOffline ? 'Device offline' : 'Waiting for data…'}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" title={ctx?.tooltipText}>
      <div className="absolute top-1 right-1 z-10">
        <Select
          value={chartType}
          onValueChange={(v) => setChartType(v as ChartType)}
          disabled={isOffline}
        >
          <SelectTrigger className="w-[100px] h-7 text-xs bg-white/80">
            <SelectValue placeholder="Chart type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="scatter">Scatter</SelectItem>
            <SelectItem value="area">Area</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="heatmap">Heatmap</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%', height: '100%', opacity: isOffline ? 0.45 : 1 }}
      />
    </div>
  );
});

DisplayTrendGraph.displayName = 'DisplayTrendGraph';

registerRenderer('DisplayTrendGraph', DisplayTrendGraph);

export default DisplayTrendGraph;
