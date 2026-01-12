import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import Plot from 'react-plotly.js';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { Layout, Data } from 'plotly.js';

import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import { useDisplayVectorGraph } from './hooks/useDisplayVectorGraph';

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

import { isPerfEnabled, perfMark, perfMeasure } from '@/shared/helpers/perf';

type PlotEngine = 'echarts' | 'plotly';
type PlotlyAxisType = 'linear' | 'log';

const buildAxisLabel = (label?: string, units?: string, fallback?: string) => {
  const base = (label ?? '').trim() || fallback || '';
  const u = (units ?? '').trim();
  if (!base && !u) return '';
  if (base && u) return `${base} (${u})`;
  return base || u;
};

type SafeEChartsProps = {
  option: EChartsOption;
  style?: React.CSSProperties;
  renderer?: 'canvas' | 'svg';
  notMerge?: boolean;
  lazyUpdate?: boolean;
  onRendered?: () => void;
};

const SafeECharts: React.FC<SafeEChartsProps> = ({
  option,
  style,
  renderer = 'canvas',
  notMerge = true,
  lazyUpdate = true,
  onRendered,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onRenderedRef = useRef<(() => void) | undefined>(onRendered);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer });
    chartRef.current = chart;

    const fireRendered = () => onRenderedRef.current?.();

    // "finished" is common; "rendered" exists in some builds.
    try {
      chart.on('finished' as any, fireRendered);
    } catch {}
    try {
      chart.on('rendered' as any, fireRendered);
    } catch {}

    const handleResize = () => {
      try {
        chart.resize();
      } catch {}
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(handleResize);
      ro.observe(el);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    try {
      chart.setOption(option, { notMerge, lazyUpdate });
    } catch {}

    return () => {
      try {
        chart.off('finished' as any, fireRendered);
      } catch {}
      try {
        chart.off('rendered' as any, fireRendered);
      } catch {}

      const ro = resizeObserverRef.current;
      if (ro) {
        try {
          ro.disconnect();
        } catch {}
        resizeObserverRef.current = null;
      } else {
        window.removeEventListener('resize', handleResize as any);
      }

      try {
        chart.dispose();
      } catch {}
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.setOption(option, { notMerge, lazyUpdate });
    } catch {}
  }, [option, notMerge, lazyUpdate]);

  return <div ref={containerRef} style={style} />;
};

type PerfUIState = {
  avgRenderMs: number;
  avgComputeMs: number;
  nRender: number;
  nCompute: number;
  lastRenderMs: number;
  lastComputeMs: number;
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

    const [isPending, startTransition] = useTransition();

    // Be tolerant if hook doesn't expose downsampleTimeMs yet.
    const hookRes = useDisplayVectorGraph(primary) as any;
    const vectorData: number[] = hookRes.vectorData ?? [];
    const indices: number[] = hookRes.indices ?? [];
    const schemaValueType = hookRes.schemaValueType;
    const isOffline: boolean = hookRes.isOffline ?? false;
    const rawLength: number = hookRes.rawLength ?? vectorData.length;
    const downsampleTimeMs: number =
      typeof hookRes.downsampleTimeMs === 'number'
        ? hookRes.downsampleTimeMs
        : 0;

    const noData = vectorData.length === 0;
    const wasDownsampled = rawLength > vectorData.length;

    const xAxisName = buildAxisLabel(x_label, x_units, 'X');
    const yAxisName = buildAxisLabel(y_label, y_units, 'Y');

    const engineRef = useRef<PlotEngine>(selectedEngine);
    const rawLengthRef = useRef<number>(rawLength);
    const displayPointsRef = useRef<number>(vectorData.length);

    useEffect(() => {
      engineRef.current = selectedEngine;
      rawLengthRef.current = rawLength;
      displayPointsRef.current = vectorData.length;
    }, [selectedEngine, rawLength, vectorData.length]);

    const [perfUI, setPerfUI] = useState<PerfUIState>({
      avgRenderMs: 0,
      avgComputeMs: 0,
      nRender: 0,
      nCompute: 0,
      lastRenderMs: 0,
      lastComputeMs: 0,
    });

    const avgRef = useRef<{
      renderSum: number;
      renderCount: number;
      computeSum: number;
      computeCount: number;
      lastRenderMs: number;
      lastComputeMs: number;
    }>({
      renderSum: 0,
      renderCount: 0,
      computeSum: 0,
      computeCount: 0,
      lastRenderMs: 0,
      lastComputeMs: 0,
    });

    const computeCycleMsRef = useRef<number>(0);

    const recordComputeStep = (
      label: string,
      startMark: string,
      endMark: string,
      meta?: Record<string, unknown>
    ) => {
      if (!isPerfEnabled()) return 0;
      const ms = perfMeasure(label, startMark, endMark, () => {}, meta);
      if (ms > 0) computeCycleMsRef.current += ms;
      return ms;
    };

    const finishCycle = (
      engine: PlotEngine,
      renderLabel: 'echarts_render' | 'plotly_render'
    ) => {
      // Ignore late callbacks from the engine that's NOT currently visible.
      if (engineRef.current !== engine) return;
      if (!isPerfEnabled()) return;

      const renderMs = perfMeasure(
        renderLabel,
        'vector_chart_render_start',
        'vector_chart_render_end',
        () => {},
        {
          rawLength: rawLengthRef.current,
          displayPoints: displayPointsRef.current,
        }
      );

      const computeMs = computeCycleMsRef.current;

      if (renderMs > 0) {
        avgRef.current.renderSum += renderMs;
        avgRef.current.renderCount += 1;
        avgRef.current.lastRenderMs = renderMs;
      }

      if (computeMs > 0) {
        avgRef.current.computeSum += computeMs;
        avgRef.current.computeCount += 1;
        avgRef.current.lastComputeMs = computeMs;
      }

      const avgRenderMs =
        avgRef.current.renderSum / Math.max(1, avgRef.current.renderCount);
      const avgComputeMs =
        avgRef.current.computeSum / Math.max(1, avgRef.current.computeCount);

      setPerfUI({
        avgRenderMs,
        avgComputeMs,
        nRender: avgRef.current.renderCount,
        nCompute: avgRef.current.computeCount,
        lastRenderMs: avgRef.current.lastRenderMs,
        lastComputeMs: avgRef.current.lastComputeMs,
      });
    };

    const makeRenderKey = (engine: PlotEngine) => {
      return [
        engine,
        vectorData.length,
        indices.length,
        title,
        background,
        x_grid,
        y_grid,
        x_log,
        y_log,
        x_invert,
        y_invert,
        x_autorange,
        x_min,
        x_max,
        y_autorange,
        y_min,
        y_max,
      ].join('|');
    };

    // Start-of-cycle timing (render) and reset compute accumulator (compute).
    // Compute starts with downsample time (measured in the hook), then adds XY/options/layout.
    const lastRenderKeyRef = useRef<string>('');
    const renderKey = makeRenderKey(selectedEngine);
    if (renderKey !== lastRenderKeyRef.current) {
      lastRenderKeyRef.current = renderKey;
      computeCycleMsRef.current = downsampleTimeMs;
      perfMark('vector_chart_render_start');
    }

    // -------- ECharts compute (only when ECharts is the active target) --------
    const echartsXYData = useMemo((): Array<[number, number]> => {
      if (selectedEngine !== 'echarts') return [];

      perfMark('vector_xy_build_start');

      const len = Math.min(indices.length, vectorData.length);
      const out = new Array<[number, number]>(len);
      for (let i = 0; i < len; i++) out[i] = [indices[i], vectorData[i]];

      recordComputeStep(
        'vector_xy_build',
        'vector_xy_build_start',
        'vector_xy_build_end',
        {
          points: len,
        }
      );

      return out;
    }, [selectedEngine, indices, vectorData]);

    const echartsOptions = useMemo((): EChartsOption => {
      if (selectedEngine !== 'echarts') return {} as EChartsOption;

      const safeYLog = y_log && vectorData.some((v) => v > 0);
      const safeXLog = x_log && indices.some((x) => x > 0);

      const showSymbols = vectorData.length < 300;
      const enableZoom = vectorData.length > 300;
      const disableAnimation = vectorData.length > 2000;

      perfMark('echarts_options_start');

      const opts: EChartsOption = {
        backgroundColor:
          background && background !== 'transparent' ? background : undefined,

        animation: !disableAnimation,

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
          type: safeXLog ? 'log' : 'value',
          name: xAxisName,
          nameLocation: 'middle',
          nameGap: 24,
          inverse: x_invert,
          min:
            x_autorange || (!Number.isFinite(x_min) && !Number.isFinite(x_max))
              ? undefined
              : x_min,
          max:
            x_autorange || (!Number.isFinite(x_min) && !Number.isFinite(x_max))
              ? undefined
              : x_max,
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
            data: echartsXYData,
            smooth: true,
            showSymbol: showSymbols,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 2 },
            progressive: 2000,
            progressiveThreshold: 4000,
          },
        ],

        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params: unknown) => {
            const first = Array.isArray(params) ? params[0] : params;
            const p = first as { value: [number, number] | number };
            const v = Array.isArray(p.value) ? p.value : [NaN, p.value];
            return `Index: ${v[0]}<br/>Value: ${v[1]}`;
          },
        },

        toolbox: { show: false },

        dataZoom: enableZoom
          ? [
              { type: 'inside', xAxisIndex: 0 },
              { type: 'slider', xAxisIndex: 0, height: 14, bottom: 6 },
            ]
          : undefined,
      };

      recordComputeStep(
        'echarts_options',
        'echarts_options_start',
        'echarts_options_end',
        {
          points: vectorData.length,
        }
      );

      return opts;
    }, [
      selectedEngine,
      vectorData,
      indices,
      echartsXYData,
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
      x_invert,
      y_invert,
      title,
      background,
    ]);

    // -------- Plotly compute (only when Plotly is the active target) --------
    const plotlyData = useMemo<Data[]>(() => {
      if (selectedEngine !== 'plotly') return [];

      perfMark('plotly_data_start');

      const d: Data[] = [
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

      recordComputeStep('plotly_data', 'plotly_data_start', 'plotly_data_end', {
        points: vectorData.length,
      });

      return d;
    }, [selectedEngine, vectorData, indices]);

    const plotlyLayout = useMemo<Partial<Layout>>(() => {
      if (selectedEngine !== 'plotly') return {} as Partial<Layout>;

      perfMark('plotly_layout_start');

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

      const layout: Partial<Layout> = {
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

      recordComputeStep(
        'plotly_layout',
        'plotly_layout_start',
        'plotly_layout_end',
        {
          points: vectorData.length,
        }
      );

      return layout;
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
      vectorData.length,
    ]);

    // Keep both charts mounted; freeze inactive props so it doesn't thrash.
    const lastEChartsOptionRef = useRef<EChartsOption>({} as EChartsOption);
    const lastPlotlyDataRef = useRef<Data[]>([]);
    const lastPlotlyLayoutRef = useRef<Partial<Layout>>({} as Partial<Layout>);

    useEffect(() => {
      if (selectedEngine === 'echarts')
        lastEChartsOptionRef.current = echartsOptions;
    }, [selectedEngine, echartsOptions]);

    useEffect(() => {
      if (selectedEngine === 'plotly') {
        lastPlotlyDataRef.current = plotlyData;
        lastPlotlyLayoutRef.current = plotlyLayout;
      }
    }, [selectedEngine, plotlyData, plotlyLayout]);

    const echartOptionForMount =
      selectedEngine === 'echarts'
        ? echartsOptions
        : lastEChartsOptionRef.current;

    const plotlyDataForMount =
      selectedEngine === 'plotly' ? plotlyData : lastPlotlyDataRef.current;

    const plotlyLayoutForMount =
      selectedEngine === 'plotly' ? plotlyLayout : lastPlotlyLayoutRef.current;

    const plotlyInitHandlerRef = useRef<boolean>(false);

    const onPlotlyInitialized = useMemo(() => {
      return (_figure: unknown, graphDiv: any) => {
        if (plotlyInitHandlerRef.current) return;
        plotlyInitHandlerRef.current = true;

        graphDiv.removeAllListeners?.('plotly_afterplot');
        graphDiv.on('plotly_afterplot', () =>
          finishCycle('plotly', 'plotly_render')
        );
      };
    }, []);

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

    const perfTooltip = [
      'Compute = JS prep for this chart (downsample + build data + options/layout).',
      'Render = end-to-end time from render-start mark to draw completion.',
      'ECharts done = finished/rendered event.',
      'Plotly done = plotly_afterplot event.',
      'Averages are per component instance; n = sample count.',
    ].join('\n');

    const layerStyle = (active: boolean): React.CSSProperties => ({
      position: 'absolute',
      inset: 0,
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none',
      transition: 'opacity 120ms ease',
    });

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
        <div className="absolute -top-7 right-2 z-10 flex items-center gap-2">
          {isPerfEnabled() && (
            <div
              className="px-2 py-1 rounded border bg-slate-50 text-[10px] font-mono text-slate-800"
              title={perfTooltip}
            >
              <div className="flex gap-2 items-center">
                <span className="font-semibold">{selectedEngine}</span>
                <span>
                  {rawLength.toLocaleString()} →{' '}
                  {vectorData.length.toLocaleString()}
                </span>
                {isPending && <span className="opacity-70">switching…</span>}
              </div>
              <div className="flex gap-3">
                <span>
                  compute avg {perfUI.avgComputeMs.toFixed(1)}ms (n=
                  {perfUI.nCompute}, last {perfUI.lastComputeMs.toFixed(1)})
                </span>
                <span>
                  render avg {perfUI.avgRenderMs.toFixed(1)}ms (n=
                  {perfUI.nRender}, last {perfUI.lastRenderMs.toFixed(1)})
                </span>
              </div>
            </div>
          )}

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
            onValueChange={(v) => {
              const next = v as PlotEngine;
              if (next === selectedEngine) return;

              // Let the UI paint first (dropdown close), then do the heavy update as a transition.
              requestAnimationFrame(() => {
                startTransition(() => {
                  setSelectedEngine(next);
                });
              });
            }}
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

        {/* Keep BOTH mounted: switching is now just a visibility toggle (no init/dispose spike). */}
        <div style={layerStyle(selectedEngine === 'echarts')}>
          <SafeECharts
            option={echartOptionForMount}
            renderer="canvas"
            notMerge
            lazyUpdate
            style={{
              width: (width ?? '100%') as any,
              height: (height ?? '100%') as any,
              opacity: isOffline ? 0.45 : 1,
            }}
            onRendered={() => finishCycle('echarts', 'echarts_render')}
          />
        </div>

        <div style={layerStyle(selectedEngine === 'plotly')}>
          <Plot
            data={plotlyDataForMount}
            layout={plotlyLayoutForMount}
            config={{
              responsive: true,
              displayModeBar: false,
              displaylogo: false,
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
            onInitialized={onPlotlyInitialized as any}
          />
        </div>
      </div>
    );
  }
);

DisplayVectorGraph.displayName = 'DisplayVectorGraph';

export default DisplayVectorGraph;
