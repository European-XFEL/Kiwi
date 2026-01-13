/**
 * DisplayTrendGraph - controller component (Plotly-based)
 */
import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';

import type { DisplayTrendGraphProps } from '@/scene/scene_types/controllers';
import { useDisplayTrendGraph } from './hooks';
import { TraceFactory, type ChartType } from './utils/traceFactory';
import { buildTimeValueHeatmap } from './utils/heatmapBining';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CanonicalChartType = 'line' | 'scatter' | 'area' | 'bar' | 'heatmap';

const CANON_TO_PLOTLY: Record<CanonicalChartType, ChartType> = {
  line: 'line',
  scatter: 'points',
  area: 'area',
  bar: 'bar',
  heatmap: 'heatmap',
};

const DisplayTrendGraph: React.FC<DisplayTrendGraphProps> = React.memo(
  ({
    primary,
    width,
    height,
    background = 'transparent',
    x_label,
    y_label,
    x_grid = true,
    y_grid = true,
  }) => {
    const [chartType, setChartType] = useState<CanonicalChartType>('line');

    const { timestamps, values, isOffline } = useDisplayTrendGraph(primary, {
      maxDataPoints: 1000,
      timeWindowMs: Infinity,
      throttleDelayMs: 500,
    });

    const plotlyChartType = CANON_TO_PLOTLY[chartType];

    const data = useMemo<Data[]>(() => {
      if (plotlyChartType === 'heatmap') {
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

      return [
        TraceFactory[plotlyChartType]({
          kind: 'xy',
          series: { x: timestamps, y: values },
          name: 'Series',
        }),
      ];
    }, [plotlyChartType, timestamps, values]);

    const layout = useMemo<Partial<Layout>>(() => {
      const isHeatmap = plotlyChartType === 'heatmap';

      return {
        autosize: true,
        margin: { t: 36, r: 12, b: 36, l: 44 },
        paper_bgcolor: background || 'transparent',
        plot_bgcolor: background ? background : 'rgba(0,0,0,0)',
        xaxis: {
          title: {
            text: isHeatmap ? 'Time bins' : x_label || 'Time',
            standoff: 8,
          },
          automargin: true,
          showgrid: !isHeatmap && x_grid,
          type: isHeatmap ? undefined : 'date',
        },
        yaxis: {
          title: {
            text: isHeatmap ? 'Value bins' : y_label || 'Value',
            standoff: 8,
          },
          automargin: true,
          showgrid: !isHeatmap && y_grid,
        },
        hovermode: isHeatmap ? 'closest' : 'x unified',
        showlegend: false,
      };
    }, [plotlyChartType, background, x_label, y_label, x_grid, y_grid]);

    return (
      <div
        className="relative w-full h-full"
        style={{
          width: (width ?? '100%') as any,
          height: (height ?? '100%') as any,
        }}
        aria-busy={isOffline ? true : undefined}
      >
        {/* top-right chart type selector */}
        <div className="absolute -top-7 right-2 z-10">
          <Select
            value={chartType}
            onValueChange={(v) => setChartType(v as CanonicalChartType)}
            disabled={isOffline}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-200">
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
          config={{
            responsive: true,
            displayModeBar: false,
            displaylogo: false,
          }}
          useResizeHandler
          style={{
            width: '100%',
            height: '100%',
            opacity: isOffline ? 0.45 : 1,
          }}
        />
      </div>
    );
  }
);

DisplayTrendGraph.displayName = 'DisplayTrendGraph';
export default DisplayTrendGraph;
