import React from 'react';
import { buildModelConfig } from '../graph/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot, ChartLegend } from '../graph/common/api';
import { useVectorChart } from '../graph/useVectorChart';
import { useVectorSeries } from '../graph/useVectorSeries';

export default function DisplayVectorGraph({
  model,
  ctx,
}: {
  model: DisplayVectorGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const series = useVectorSeries(ctx?.proxies ?? [], model.keys);
  const view = useVectorChart({ plotConfig, series });

  return (
    <ChartLayout background={plotConfig.background} viewBox={view}>
      <ChartPlot
        view={view}
        testId="vector-chart"
        title={plotConfig.title}
        legend={
          <ChartLegend keys={series.map((item) => item.key)} view={view} />
        }
      />
    </ChartLayout>
  );
}
