import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorXYGraphModel } from '@/karabo/common/api';
import {
  buildModelConfig,
  ChartLayout,
  ChartPlot,
  GRAPH_LAYOUT,
  TRACE_COLORS,
} from '../graph/common/api';
import { useVectorXYData } from '../graph/useVectorXYData';
import { useVectorXYChart } from '../graph/useVectorXYChart';

export default function DisplayVectorXYGraph({
  model,
  ctx,
}: {
  model: VectorXYGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const { x, series } = useVectorXYData(ctx?.proxies ?? [], model.keys);
  const view = useVectorXYChart({ plotConfig, x, series });
  return (
    <ChartLayout background={plotConfig.background} viewBox={view}>
      <ChartPlot
        containerRef={view.containerRef}
        selectionRef={view.selectionRef}
        testId="vector-xy-chart"
        title={plotConfig.title}
        legend={
          series.length > 1 && (
            <div
              className="absolute z-10 flex flex-col gap-1 rounded-sm border border-black bg-slate-200/20 p-1 text-xs text-black"
              style={{
                top: plotConfig.title ? 26 : 10,
                left:
                  GRAPH_LAYOUT.yAxisSize[
                    plotConfig.y_label || plotConfig.y_units
                      ? 'titled'
                      : 'untitled'
                  ] + 8,
              }}
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
}
