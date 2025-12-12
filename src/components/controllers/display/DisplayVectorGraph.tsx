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
  type SchemaValueType,
} from '@/shared/helpers/validation_helpers/schema_type_identifier';

type PlotEngine = 'echarts' | 'plotly';

/**
 * Try to get one schema valueType signal.
 * We keep this tolerant because different layers may expose it differently.
 */
const getSchemaValueType = (
  primary: DisplayVectorGraphProps['primary']
): SchemaValueType | undefined => {
  // Priority:
  // 1) primary.valueType (if your container exposes it)
  // 2) primary.schemaAttrs.valueType
  // 3) model.property_schema.schemaAttrs.valueType (deep fallback)
  return (
    (primary as any)?.valueType ??
    primary?.schemaAttrs?.valueType ??
    primary?.model?.property_schema?.schemaAttrs?.valueType
  );
};

const toNumberSafe = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'bigint') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Normalize a raw vector-ish value into number[].
 *
 * Schema-first:
 * - If schema says VECTOR → parse arrays/typed arrays.
 * - If schema is missing → allow runtime shape-based fallback.
 */
const normalizeVector = (
  raw: unknown,
  schemaValueType?: SchemaValueType
): number[] => {
  if (!raw) return [];

  const schemaKnowsVector = schemaSaysVector(schemaValueType);

  const isRuntimeVectorShape =
    Array.isArray(raw) ||
    (ArrayBuffer.isView(raw) && !(raw instanceof DataView));

  // If schema explicitly says "not vector" and runtime doesn't look vector → bail
  if (!schemaKnowsVector && !isRuntimeVectorShape) return [];

  // Typed arrays (Float32Array, Int32Array, Uint8Array, etc.)
  if (ArrayBuffer.isView(raw) && !(raw instanceof DataView)) {
    try {
      const arr = Array.from(raw as any);
      return arr.map(toNumberSafe).filter((v): v is number => v != null);
    } catch {
      return [];
    }
  }

  // Plain arrays
  if (Array.isArray(raw)) {
    return raw.map(toNumberSafe).filter((v): v is number => v != null);
  }

  return [];
};

/**
 * Apply offset + step sampling to a vector while preserving original indices.
 */
const applyOffsetStep = (
  data: number[],
  offset?: number,
  step?: number
): { values: number[]; indices: number[] } => {
  const safeOffset = Math.max(0, offset ?? 0);
  const safeStep = Math.max(1, step ?? 1);

  const sampled: { v: number; i: number }[] = [];

  for (let i = safeOffset; i < data.length; i += safeStep) {
    sampled.push({ v: data[i], i });
  }

  return {
    values: sampled.map((s) => s.v),
    indices: sampled.map((s) => s.i),
  };
};

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

      offset,
      step,
      roi_tool,

      tooltipText,
      disabledReason,
    } = props as DisplayVectorGraphProps & {
      offset?: number;
      step?: number;
      roi_tool?: number;
    };

    const [selectedEngine, setSelectedEngine] =
      useState<PlotEngine>(plot_engine);

    const isOffline = primary?.isOffline ?? false;

    const schemaValueType = useMemo(
      () => getSchemaValueType(primary),
      [primary]
    );

    // Prefer runtime value; fallback to schema default value
    const rawVector = primary?.value ?? primary?.schemaAttrs?.defaultValue;

    const baseVector = useMemo(
      () => normalizeVector(rawVector, schemaValueType),
      [rawVector, schemaValueType]
    );

    const { values: vectorData, indices } = useMemo(
      () => applyOffsetStep(baseVector, offset, step),
      [baseVector, offset, step]
    );

    const noData = vectorData.length === 0;

    const xAxisName = buildAxisLabel(x_label, x_units, 'Index');
    const yAxisName = buildAxisLabel(y_label, y_units, 'Value');

    // ---------------------------------------------------------------------------
    // ECharts options
    // ---------------------------------------------------------------------------
    const echartsOptions = useMemo((): EChartsOption => {
      // ECharts category axis doesn't support log meaningfully here
      // because we are using indices as categories.
      // We'll keep x_log ignored in ECharts for safety/consistency.

      const safeYLog = y_log && vectorData.some((v) => v > 0) ? true : false;

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
          name: xAxisName || 'Index',
          nameLocation: 'middle',
          nameGap: 24,
          inverse: !!x_invert,
          axisLine: { show: true },
          axisTick: { show: true },
          splitLine: { show: !!x_grid },
        },

        yAxis: {
          type: safeYLog ? 'log' : 'value',
          name: yAxisName || 'Value',
          nameLocation: 'middle',
          nameGap: 36,
          inverse: !!y_invert,
          min: y_autorange ? undefined : y_min,
          max: y_autorange ? undefined : y_max,
          axisLine: { show: true },
          axisTick: { show: true },
          splitLine: { show: !!y_grid },
        },

        series: [
          {
            type: 'line',
            data: vectorData,
            smooth: true,
            showSymbol: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2 },
          },
        ],

        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params: any) => {
            const param = Array.isArray(params) ? params[0] : params;
            return `Index: ${param.name}<br/>Value: ${param.value}`;
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

    // ---------------------------------------------------------------------------
    // Plotly data
    // ---------------------------------------------------------------------------
    const plotlyData = useMemo<Data[]>(
      () => [
        {
          type: 'scatter',
          mode: 'lines+markers',
          x: indices,
          y: vectorData,
          marker: { size: 4 },
          line: { width: 2 },
          hovertemplate: 'Index: %{x}<br>Value: %{y}<extra></extra>',
        },
      ],
      [vectorData, indices]
    );

    // ---------------------------------------------------------------------------
    // Plotly layout (with correct typing)
    // ---------------------------------------------------------------------------
    const plotlyLayout = useMemo<Partial<Layout>>(() => {
      const xRange =
        x_autorange || (!Number.isFinite(x_min) && !Number.isFinite(x_max))
          ? undefined
          : ([x_min, x_max] as [number, number]);

      const yRange =
        y_autorange || (!Number.isFinite(y_min) && !Number.isFinite(y_max))
          ? undefined
          : ([y_min, y_max] as [number, number]);

      // Plotly x-axis can be numeric here because indices are numbers
      const xType = x_log ? 'log' : 'linear';

      // For log axes, Plotly expects positive values in range
      const safeYType = y_log ? 'log' : 'linear';

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

        //title is an object
        title: title ? { text: title } : undefined,

        xaxis: {
          title: { text: xAxisName || 'Index' },
          showgrid: !!x_grid,
          type: xType as any,
          autorange: x_autorange ? true : false,
          range: xRange,
        },

        yaxis: {
          title: { text: yAxisName || 'Value' },
          showgrid: !!y_grid,
          type: safeYType,
          autorange: y_autorange ? true : false,
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
      x_autorange,
      x_min,
      x_max,
      y_autorange,
      y_min,
      y_max,
      title,
      background,
    ]);

    // ---------------------------------------------------------------------------
    // Empty/offline
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <div
        className="relative w-full h-full"
        style={{ backgroundColor: background || 'transparent' }}
        title={tooltipText || disabledReason}
        aria-live="polite"
        data-offset={offset}
        data-step={step}
        data-roi-tool={roi_tool}
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
        {/* Engine selector */}
        <div className="absolute -top-7 right-2 z-10">
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

        {/* Render selected engine */}
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
