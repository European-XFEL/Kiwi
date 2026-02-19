import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';

import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import { useDisplayVectorGraph } from './hooks/useDisplayVectorGraph';

import {
  schemaSaysVector,
  schemaSaysFloat,
  schemaSaysInt,
} from '@/features/controllers/utils/validation/hashTypeIdentifiers';

type PlotlyAxisType = 'linear' | 'log';

const buildAxisLabel = (label?: string, units?: string, fallback?: string) => {
  const base = (label ?? '').trim() || fallback || '';
  const u = (units ?? '').trim();
  if (!base && !u) return '';
  if (base && u) return `${base} (${u})`;
  return base || u;
};

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

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

      tooltipText,
      disabledReason,
    } = props as DisplayVectorGraphProps;

    const hookRes = useDisplayVectorGraph(primary) as any;
    const vectorData: number[] = hookRes.vectorData ?? [];
    const indices: number[] = hookRes.indices ?? [];
    const schemaValueType = hookRes.schemaValueType;
    const isOffline: boolean = hookRes.isOffline ?? false;

    const noData = vectorData.length === 0;

    const xAxisName = buildAxisLabel(x_label, x_units, 'X');
    const yAxisName = buildAxisLabel(y_label, y_units, 'Y');

    const plotlyData = useMemo<Data[]>(() => {
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
    }, [vectorData, indices]);

    const plotlyLayout = useMemo<Partial<Layout>>(() => {
      const xType: PlotlyAxisType = x_log ? 'log' : 'linear';
      const yType: PlotlyAxisType = y_log ? 'log' : 'linear';

      const hasXRange = isFiniteNumber(x_min) && isFiniteNumber(x_max);
      const hasYRange = isFiniteNumber(y_min) && isFiniteNumber(y_max);

      const xRange =
        !x_autorange && hasXRange
          ? x_invert
            ? ([x_max, x_min] as [number, number])
            : ([x_min, x_max] as [number, number])
          : undefined;

      const yRange =
        !y_autorange && hasYRange
          ? y_invert
            ? ([y_max, y_min] as [number, number])
            : ([y_min, y_max] as [number, number])
          : undefined;

      // Plotly allows autorange = 'reversed' for inverted axes when autorange is enabled.
      const xAutorange: Layout['xaxis']['autorange'] = x_autorange
        ? x_invert
          ? 'reversed'
          : true
        : false;

      const yAutorange: Layout['yaxis']['autorange'] = y_autorange
        ? y_invert
          ? 'reversed'
          : true
        : false;

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
          autorange: xAutorange,
          range: xRange,
        },

        yaxis: {
          title: { text: yAxisName },
          showgrid: y_grid,
          type: yType,
          autorange: yAutorange,
          range: yRange,
        },

        showlegend: false,
        hovermode: 'x unified',
      };
    }, [
      xAxisName,
      yAxisName,
      x_grid,
      y_grid,
      x_log,
      y_log,
      x_invert,
      y_invert,
      x_autorange,
      y_autorange,
      x_min,
      x_max,
      y_min,
      y_max,
      title,
      background,
    ]);

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

    return (
      <div
        className="relative w-full h-full"
        style={{
          backgroundColor: background || 'transparent',
          width: (width ?? '100%') as any,
          height: (height ?? '100%') as any,
        }}
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
      >
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
      </div>
    );
  }
);

DisplayVectorGraph.displayName = 'DisplayVectorGraph';

export default DisplayVectorGraph;
