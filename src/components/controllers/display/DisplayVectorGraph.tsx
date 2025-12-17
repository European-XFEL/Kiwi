/**
 * VectorGraph - Displays vector/array data as a line graph
 *
 * Dual-engine (ECharts + Plotly).
 */

import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Layout, Data } from 'plotly.js';

import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import { useDisplayVectorGraph } from '@/components/shared/hooks/useDisplayVectorGraph';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  schemaSaysVector,
  schemaSaysFloat,
  schemaSaysInt,
} from '@/shared/helpers/validation_helpers/schema_type_identifier';

type PlotEngine = 'echarts' | 'plotly';
type PlotlyAxisType = 'linear' | 'log';

const buildAxisLabel = (label?: string, units?: string, fallback?: string) => {
  const base = (label ?? '').trim() || fallback || '';
  const u = (units ?? '').trim();
  if (!base && !u) return '';
  if (base && u) return `${base} (${u})`;
  return base || u;
};

const DisplayVectorGraph: React.FC<DisplayVectorGraphProps> = React.memo(
  (props) => {
    const {
      primary,

      width,
      height,

      x_label,
      y_label,
      x_units,
      y_units,

      x_grid = false,
      y_grid = false,
      x_log = false,
      y_log = false,
      x_invert = false,
      y_invert = false,

      x_autorange = true,
      y_autorange = true,

      x_min = 0,
      x_max = 0,
      y_min = 0,
      y_max = 0,

      title = '',
      background = 'transparent',
      plot_engine = 'echarts',

      tooltipText,
      disabledReason,
    } = props as DisplayVectorGraphProps & {
      offset?: number;
      step?: number;
      roi_tool?: number;
    };

    const [selectedEngine, setSelectedEngine] =
      useState<PlotEngine>(plot_engine);

    // useDisplayVectorGraph:
    // - validates vector type
    // - throttles updates (Hz)
    // - downsamples to maxPoints
    const { vectorData, indices, schemaValueType, isOffline, rawLength } =
      useDisplayVectorGraph(primary, {
        maxPoints: 1_000, // Chart render limit
        maxUpdateHz: 10, // 10 Hz = 100ms throttle
        // propertyUpdateIntervalMs can be added from GUI server config
      });

    const noData = vectorData.length === 0;
    const wasDownsampled = rawLength > vectorData.length;

    const xAxisName = buildAxisLabel(x_label, x_units, 'X');
    const yAxisName = buildAxisLabel(y_label, y_units, 'Y');

    // ────────────────────────────────────────────────────────────────
    // ECharts options (only calculate if selected)
    // ────────────────────────────────────────────────────────────────
    const echartsOptions = useMemo((): EChartsOption => {
      if (selectedEngine !== 'echarts') {
        return {} as EChartsOption;
      }

      const safeYLog = y_log && vectorData.some((v) => v > 0);

      return {
        backgroundColor:
          background && background !== 'transparent' ? background : undefined,

        title: title
          ? {
              text: title,
              left: 'center',
              top: 6,
              textStyle: { fontSize: 12, fontWeight: 'normal' },
            }
          : undefined,

        grid: {
          left: 40,
          right: 16,
          top: title ? 32 : 12,
          bottom: 32,
          containLabel: true,
        },

        xAxis: {
          type: 'category',
          data: indices.map(String),
          name: xAxisName,
          nameLocation: 'middle',
          nameGap: 24,
          inverse: x_invert,
          axisLine: { show: true },
          axisTick: { show: true },
          splitLine: { show: x_grid },
        },

        yAxis: {
          type: safeYLog ? 'log' : 'value',
          name: yAxisName,
          nameLocation: 'middle',
          nameGap: 36,
          inverse: y_invert,
          min: y_autorange ? undefined : y_min,
          max: y_autorange ? undefined : y_max,
          axisLine: { show: true },
          axisTick: { show: true },
          splitLine: { show: y_grid },
        },

        series: [
          {
            type: 'line',
            data: vectorData,
            smooth: true,
            showSymbol: vectorData.length < 300,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2 },
          },
        ],

        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params: unknown) => {
            const first = Array.isArray(params) ? params[0] : params;
            const p = first as { name: string; value: number };
            return `Index: ${p.name}<br/>Value: ${p.value}`;
          },
        },

        toolbox: { show: false },

        dataZoom:
          vectorData.length > 300
            ? [
                { type: 'inside', xAxisIndex: 0 },
                { type: 'slider', xAxisIndex: 0, height: 14, bottom: 6 },
              ]
            : undefined,
      };
    }, [
      selectedEngine,
      vectorData,
      indices,
      xAxisName,
      yAxisName,
      x_grid,
      y_grid,
      y_log,
      y_autorange,
      y_min,
      y_max,
      x_invert,
      y_invert,
      title,
      background,
    ]);

    // ────────────────────────────────────────────────────────────────
    // Plotly data (only calculate if selected)
    // ────────────────────────────────────────────────────────────────
    const plotlyData = useMemo<Data[]>(() => {
      if (selectedEngine !== 'plotly') {
        return [];
      }

      return [
        {
          type: 'scatter',
          mode: vectorData.length < 300 ? 'lines+markers' : 'lines',
          x: indices,
          y: vectorData,
          marker: { size: 4 },
          line: { width: 2 },
          hovertemplate: 'Index: %{x}<br>Value: %{y}<extra></extra>',
        },
      ];
    }, [selectedEngine, vectorData, indices]);

    // ────────────────────────────────────────────────────────────────
    // Plotly layout (only calculate if selected)
    // ────────────────────────────────────────────────────────────────
    const plotlyLayout = useMemo<Partial<Layout>>(() => {
      if (selectedEngine !== 'plotly') {
        return {} as Partial<Layout>;
      }

      const xRange =
        x_autorange || (!Number.isFinite(x_min) && !Number.isFinite(x_max))
          ? undefined
          : ([x_min, x_max] as [number, number]);

      const yRange =
        y_autorange || (!Number.isFinite(y_min) && !Number.isFinite(y_max))
          ? undefined
          : ([y_min, y_max] as [number, number]);

      const xType: PlotlyAxisType = x_log ? 'log' : 'linear';
      const yType: PlotlyAxisType = y_log ? 'log' : 'linear';

      return {
        autosize: true,
        margin: { l: 60, r: 30, t: title ? 60 : 30, b: 60 },

        paper_bgcolor:
          background && background !== 'transparent'
            ? background
            : 'rgba(0,0,0,0)',
        plot_bgcolor:
          background && background !== 'transparent'
            ? background
            : 'rgba(0,0,0,0)',

        title: title ? { text: title } : undefined,

        xaxis: {
          title: { text: xAxisName },
          showgrid: x_grid,
          type: xType,
          autorange: x_autorange,
          range: xRange,
        },

        yaxis: {
          title: { text: yAxisName },
          showgrid: y_grid,
          type: yType,
          autorange: y_autorange,
          range: yRange,
        },

        showlegend: false,
        hovermode: 'x unified',
      };
    }, [
      selectedEngine,
      xAxisName,
      yAxisName,
      x_grid,
      y_grid,
      x_log,
      y_log,
      x_autorange,
      x_min,
      x_max,
      y_autorange,
      y_min,
      y_max,
      title,
      background,
    ]);

    // ────────────────────────────────────────────────────────────────
    // Empty/offline state
    // ────────────────────────────────────────────────────────────────
    if (isOffline || noData) {
      return (
        <div
          className="flex items-center justify-center w-full h-full border border-slate-200 bg-slate-50"
          title={tooltipText || disabledReason}
          aria-busy={isOffline ? true : undefined}
          aria-live="polite"
        >
          <div className="text-center px-3">
            <div className="text-xs font-medium text-slate-700">
              {isOffline ? 'Device offline' : 'No vector data available'}
            </div>
            {(tooltipText || disabledReason) && (
              <div className="mt-1 text-[10px] text-slate-500">
                {tooltipText || disabledReason}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ────────────────────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────────────────────
    return (
      <div
        className="relative w-full h-full"
        style={{ backgroundColor: background || 'transparent' }}
        title={tooltipText || disabledReason}
        aria-live="polite"
        data-schema-value-type={
          typeof schemaValueType === 'string'
            ? schemaValueType
            : typeof schemaValueType === 'number'
              ? String(schemaValueType)
              : undefined
        }
        data-schema-says-vector={schemaSaysVector(schemaValueType) || undefined}
        data-schema-says-float={schemaSaysFloat(schemaValueType) || undefined}
        data-schema-says-int={schemaSaysInt(schemaValueType) || undefined}
        data-original-size={rawLength}
        data-display-points={vectorData.length}
        data-was-downsampled={wasDownsampled}
      >
        {/* Engine selector + Downsampling indicator */}
        <div className="absolute -top-7 right-2 z-10 flex items-center gap-2">
          {wasDownsampled && (
            <div
              className="px-2 py-1 bg-amber-100 border border-amber-400 rounded text-[10px] font-mono text-amber-900"
              title={`Displaying ${vectorData.length} of ${rawLength} points (downsampled for performance)`}
            >
              {rawLength.toLocaleString()} → {vectorData.length}
            </div>
          )}
          <Select
            value={selectedEngine}
            onValueChange={(v) => setSelectedEngine(v as PlotEngine)}
            disabled={isOffline}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-200">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="echarts">ECharts</SelectItem>
              <SelectItem value="plotly">Plotly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedEngine === 'echarts' ? (
          <ReactECharts
            option={echartsOptions}
            style={{
              width: width ?? '100%',
              height: height ?? '100%',
              opacity: isOffline ? 0.45 : 1,
            }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        ) : (
          <Plot
            data={plotlyData}
            layout={plotlyLayout}
            config={{
              responsive: true,
              displayModeBar: false,
              displaylogo: false,
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
          />
        )}
      </div>
    );
  }
);

DisplayVectorGraph.displayName = 'DisplayVectorGraph';

export default DisplayVectorGraph;
