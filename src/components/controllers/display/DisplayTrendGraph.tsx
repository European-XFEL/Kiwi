/**
 * DisplayTrendGraph - controller component
 *
 */
import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import type { Layout, Data } from 'plotly.js';
import type { DisplayTrendGraphProps } from '@/scene/scene_types/controllers';
import { TraceFactory, ChartType } from '@/karabo_plots/traceFactory';
import { buildTimeValueHeatmap } from '@/karabo_plots/heatmapBining';
import { buildEChartsOptions, EChartType } from '@/karabo_plots/echartsOptions';
import { useDisplayTrendGraph } from '@/components/shared/hooks/useDisplayTrendGraph';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CanonicalChartType = 'line' | 'scatter' | 'area' | 'heatmap' | 'bar';

const DisplayTrendGraph: React.FC<DisplayTrendGraphProps> = React.memo(
  (props) => {
    const {
      primary,
      width,
      height,
      background,
      x_label,
      y_label,
      x_grid,
      y_grid,
      plot_engine = 'echarts',
    } = props;

    const [chartType, setChartType] = useState<CanonicalChartType>('line');
    const [engine, setEngine] = useState<'plotly' | 'echarts'>(plot_engine);

    const { timestamps, values, isOffline } = useDisplayTrendGraph(primary, {
      maxDataPoints: 1000,
      timeWindowMs: Infinity,
      throttleDelayMs: 500,
    });

    const plotlyChartType: ChartType = (() => {
      if (chartType === 'scatter') return 'points';
      if (chartType === 'heatmap') return 'heatmap';
      if (chartType === 'area') return 'area';
      if (chartType === 'bar') return 'bar';
      return 'line';
    })();

    const traceInput =
      plotlyChartType === 'heatmap'
        ? ({
            kind: 'heatmap',
            series: buildTimeValueHeatmap(timestamps, values, {
              timeBins: 24,
              valueBins: 10,
            }),
            name: 'Density',
          } as const)
        : ({
            kind: 'xy',
            series: { x: timestamps, y: values },
            name: 'Series',
          } as const);

    const data: Data[] =
      engine === 'plotly' ? [TraceFactory[plotlyChartType](traceInput)] : [];

    const echartsOption = useMemo(
      () =>
        engine === 'echarts'
          ? buildEChartsOptions({
              timestamps,
              values,
              chartType: (chartType as EChartType) || 'line',
              xLabel: x_label,
              yLabel: y_label,
              xGrid: x_grid ?? true,
              yGrid: y_grid ?? true,
              background: background || 'transparent',
            })
          : null,
      [
        engine,
        timestamps,
        values,
        chartType,
        x_label,
        y_label,
        x_grid,
        y_grid,
        background,
      ]
    );

    const layout: Partial<Layout> = {
      autosize: true,
      margin: { t: 36, r: 12, b: 36, l: 44 },
      paper_bgcolor: background || 'transparent',
      plot_bgcolor: background || 'rgba(0,0,0,0)',
      xaxis: {
        title: {
          text: chartType === 'heatmap' ? 'Time bins' : x_label || 'Time',
          standoff: 8,
        },
        automargin: true,
        showgrid: chartType !== 'heatmap' && (x_grid ?? true),
        type: chartType === 'heatmap' ? undefined : 'date',
      },
      yaxis: {
        title: {
          text: chartType === 'heatmap' ? 'Value bins' : y_label || 'Value',
          standoff: 8,
        },
        automargin: true,
        showgrid: chartType !== 'heatmap' && (y_grid ?? true),
      },
      hovermode: chartType === 'heatmap' ? 'closest' : 'x unified',
      showlegend: false,
    };

    return (
      <div className="w-full h-full" aria-busy={isOffline ? true : undefined}>
        {/* top-right controls */}
        <div className="absolute -top-7 right-2 z-10 flex gap-2">
          <Select
            value={engine}
            onValueChange={(val) => setEngine(val as 'plotly' | 'echarts')}
            disabled={isOffline}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-200">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plotly">Plotly</SelectItem>
              <SelectItem value="echarts">ECharts</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={chartType}
            onValueChange={(value) => setChartType(value as CanonicalChartType)}
            disabled={isOffline}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-red-200">
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

        {/* chart area */}
        {engine === 'plotly' ? (
          <Plot
            data={data}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            useResizeHandler
            style={{
              width: '100%',
              height: '100%',
              opacity: isOffline ? 0.45 : 1,
            }}
          />
        ) : (
          <ReactECharts
            option={echartsOption!}
            style={{ width, height, opacity: isOffline ? 0.45 : 1 }}
            notMerge
            lazyUpdate
          />
        )}
      </div>
    );
  }
);

export default DisplayTrendGraph;
