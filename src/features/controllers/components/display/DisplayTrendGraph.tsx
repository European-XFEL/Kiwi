/** DisplayTrendGraph — rolling time-series chart using Plotly. */

import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { ProxyStatus } from '@/lib/binding/api';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import type { PropertyProxies } from '../../hooks/useController';
import { useDisplayTrendGraph } from '../../hooks/useDisplayTrendGraph';
import { TraceFactory } from '../../utils/traceFactory';

// DisplayTrendGraph
// ----------------------------------------------------------------------------

const TRACE_COLORS = [
  '#009be5',
  '#ff0040',
  '#2ca02c',
  '#ff9f1a',
  '#8a2be2',
  '#00a3a3',
];

const PLOT_CONFIG = {
  responsive: true,
  scrollZoom: true,
  displayModeBar: false, // Temporarily hidden because it renders outside the graph area (issue #264).
  displaylogo: false,
};

type SeriesInfo = {
  label: string;
  hoverTemplate: string;
};

const buildSeriesInfo = (
  proxies: PropertyProxies,
  keys: string[]
): SeriesInfo[] =>
  proxies.map((proxy, index) => {
    const key = keys[index];
    const displayName = proxy?.binding?.displayedName;
    const propertyPath = proxy?.path;
    const title = displayName || propertyPath || key || `Series ${index + 1}`;
    const subtitle = displayName && key ? key : undefined;
    const label = displayName
      ? keys.length === 1 || !key
        ? displayName
        : `${displayName} (${key})`
      : key || propertyPath || `Series ${index + 1}`;

    return {
      label,
      hoverTemplate: [
        title ? `<b>${title}</b>` : undefined,
        subtitle,
        'Value: %{y:.6f}',
      ]
        .filter(Boolean)
        .join('<br>')
        .concat('<extra></extra>'),
    };
  });

const DisplayTrendGraph: React.FC<{
  model: DisplayTrendGraphModel;
  ctx?: ControllerContainerContext;
}> = React.memo(({ model, ctx }) => {
  if (!ctx) return null;

  const [viewRevision, setViewRevision] = React.useState(0);
  const proxies = ctx.proxies;
  const rootDeviceId = ctx.proxy?.root.deviceId;
  const rootIsOffline =
    (ctx.proxy?.root.status ?? ProxyStatus.OFFLINE) === ProxyStatus.OFFLINE;
  const { series, isOffline } = useDisplayTrendGraph(
    proxies,
    rootIsOffline,
    rootDeviceId
  );

  const noData = series.every((item) => item.values.length === 0);

  const seriesInfoSignature = proxies
    .map((proxy, index) =>
      [
        model.keys[index] ?? '',
        proxy?.path ?? '',
        proxy?.binding?.displayedName ?? '',
      ].join('\u001f')
    )
    .join('\u001e');

  const seriesInfo = React.useMemo(
    () => buildSeriesInfo(proxies, model.keys),
    // Labels and hover text only change when schema-ish metadata changes.
    // Live value updates replace `proxies`, but they should not rebuild this memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriesInfoSignature]
  );

  const data = React.useMemo<Data[]>(() => {
    const builder = TraceFactory.line as (input: any) => Data;

    return series.flatMap((item, index) => {
      if (item.values.length === 0) return [];

      const color = TRACE_COLORS[index % TRACE_COLORS.length];
      const info = seriesInfo[index];
      const trace = builder({
        kind: 'xy',
        series: { x: item.timestamps, y: item.values },
        name: info?.label,
      }) as Data;

      return {
        ...trace,
        hovertemplate: info?.hoverTemplate ?? 'Value: %{y:.6f}<extra></extra>',
        marker: { ...((trace as any).marker ?? {}), color },
        line: { ...((trace as any).line ?? {}), color },
      };
    });
  }, [series, seriesInfo]);

  const layout = React.useMemo<Partial<Layout>>(() => {
    const bgcolor =
      model.background && model.background !== 'transparent'
        ? model.background
        : 'rgba(0,0,0,0)';

    const xLabel = [model.x_label, model.x_units].filter(Boolean).join(' ');
    const yLabel = [model.y_label, model.y_units].filter(Boolean).join(' ');

    const yRange =
      !model.y_autorange && model.y_min !== model.y_max
        ? ([model.y_min, model.y_max] as [number, number])
        : undefined;

    return {
      autosize: true,
      title: model.title
        ? { text: model.title, font: { size: 13 } }
        : undefined,
      margin: { t: model.title ? 32 : 8, r: 40, b: 28, l: 36, pad: 2 },
      paper_bgcolor: bgcolor,
      plot_bgcolor: bgcolor,
      xaxis: {
        title: {
          text: xLabel || 'Time',
          standoff: 8,
        },
        showgrid: model.x_grid,
        type: 'date',
        autorange: model.x_invert ? 'reversed' : true,
        hoverformat: '%b %d, %Y %H:%M:%S.%L',
        automargin: true,
      },
      yaxis: {
        title: {
          text: yLabel || 'Value',
          standoff: 8,
        },
        showgrid: model.y_grid,
        type: model.y_log ? 'log' : undefined,
        autorange: model.y_invert
          ? 'reversed'
          : model.y_autorange
            ? true
            : undefined,
        range: yRange,
        automargin: true,
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: 'rgba(255, 255, 255, 0.78)',
        bordercolor: 'rgba(148, 163, 184, 0.35)',
        font: { color: '#111827' },
      },

      showlegend: false,
    };
  }, [model, viewRevision]);

  if (isOffline || noData) {
    return (
      <div className="flex items-center justify-center w-full h-full border border-slate-200 bg-slate-50 text-xs text-slate-500 select-none">
        {isOffline ? 'Device offline' : 'Waiting for data…'}
      </div>
    );
  }

  return (
    <div className="flex w-full h-full rounded-sm border-2 border-slate-200">
      <div className="min-w-0 flex-1">
        <Plot
          className="kiwi-trend-chart"
          data={data}
          layout={layout}
          config={PLOT_CONFIG}
          revision={viewRevision}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div
        role="toolbar"
        aria-label="Trend graph controls"
        className="flex w-8 shrink-0 flex-col items-center bg-transparent py-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reset view"
          title="Reset view"
          className="h-7 w-7 rounded-sm"
          onClick={() => setViewRevision((revision) => revision + 1)}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});

DisplayTrendGraph.displayName = 'DisplayTrendGraph';

export default DisplayTrendGraph;
