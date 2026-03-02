/** DisplayVectorGraph — array/vector data chart using Plotly. */

import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { DisplayVectorGraphModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { useDisplayVectorGraph } from '@/features/scene-view/hooks/useDisplayVectorGraph';

// DisplayVectorGraph
// ----------------------------------------------------------------------------

const buildLabel = (label?: string, units?: string, fallback?: string) => {
  const base = (label ?? '').trim() || (fallback ?? '');
  const u = (units ?? '').trim();
  if (base && u) return `${base} (${u})`;
  return base || u;
};

const DisplayVectorGraph: React.FC<{
  model: DisplayVectorGraphModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const { vectorData, indices, isOffline } = useDisplayVectorGraph(
    ctx?.primary
  );

  const noData = vectorData.length === 0;

  const data = React.useMemo<Data[]>(
    () => [
      {
        type: 'scatter',
        mode: vectorData.length < 300 ? 'lines+markers' : 'lines',
        x: indices,
        y: vectorData,
        marker: { size: 4 },
        line: { width: 1.5 },
        name: model.y_label || 'Value',
      },
    ],
    [vectorData, indices, model.y_label]
  );

  const layout = React.useMemo<Partial<Layout>>(() => {
    const hasYRange =
      !model.y_autorange &&
      Number.isFinite(model.y_min) &&
      Number.isFinite(model.y_max) &&
      model.y_min !== model.y_max;

    const hasXRange =
      !model.x_autorange &&
      Number.isFinite(model.x_min) &&
      Number.isFinite(model.x_max) &&
      model.x_min !== model.x_max;

    return {
      autosize: true,
      margin: { t: model.title ? 36 : 12, r: 12, b: 40, l: 56 },
      paper_bgcolor:
        model.background && model.background !== 'transparent'
          ? model.background
          : 'rgba(0,0,0,0)',
      plot_bgcolor:
        model.background && model.background !== 'transparent'
          ? model.background
          : 'rgba(0,0,0,0)',
      title: model.title
        ? { text: model.title, font: { size: 12 } }
        : undefined,
      xaxis: {
        title: {
          text: buildLabel(model.x_label, model.x_units, 'Index'),
          standoff: 4,
        },
        showgrid: model.x_grid,
        type: model.x_log ? 'log' : 'linear',
        autorange: model.x_autorange
          ? model.x_invert
            ? 'reversed'
            : true
          : false,
        range: hasXRange
          ? model.x_invert
            ? [model.x_max, model.x_min]
            : [model.x_min, model.x_max]
          : undefined,
        automargin: true,
      },
      yaxis: {
        title: {
          text: buildLabel(model.y_label, model.y_units, 'Value'),
          standoff: 4,
        },
        showgrid: model.y_grid,
        type: model.y_log ? 'log' : 'linear',
        autorange: model.y_autorange
          ? model.y_invert
            ? 'reversed'
            : true
          : false,
        range: hasYRange
          ? model.y_invert
            ? [model.y_max, model.y_min]
            : [model.y_min, model.y_max]
          : undefined,
        automargin: true,
      },
      showlegend: false,
      hovermode: 'x unified',
    };
  }, [model]);

  if (isOffline || noData) {
    return (
      <div
        className="flex items-center justify-center w-full h-full border border-slate-200 bg-slate-50 text-xs text-slate-500 select-none"
        title={ctx?.tooltipText ?? ctx?.disabledReason}
      >
        {isOffline ? 'Device offline' : 'No vector data'}
      </div>
    );
  }

  return (
    <div className="w-full h-full" title={ctx?.tooltipText}>
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

registerRenderer('DisplayVectorGraph', DisplayVectorGraph);

export default DisplayVectorGraph;
