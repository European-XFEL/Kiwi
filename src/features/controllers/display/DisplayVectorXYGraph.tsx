import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorXYGraphModel } from '@/karabo/common/api';
import {
  buildModelConfig,
  ChartLayout,
  ChartPlot,
  ChartLegend,
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
        view={view}
        testId="vector-xy-chart"
        title={plotConfig.title}
        legend={
          <ChartLegend keys={series.map((item) => item.key)} view={view} />
        }
      />
    </ChartLayout>
  );
}
