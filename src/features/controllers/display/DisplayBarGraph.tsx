import React from 'react';
import { buildModelConfig } from '../graph/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorBarGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { useVectorBarChart } from '../graph/useVectorBarChart';
import { useVectorSeries } from '../graph/useVectorSeries';

export default function DisplayBarGraph({
  model,
  ctx,
}: {
  model: VectorBarGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const [series] = useVectorSeries({
    proxies: [ctx?.proxy],
    keys: [model.keys[0] ?? ''],
  });
  const view = useVectorBarChart({ plotConfig, values: series.values });

  return (
    <ChartLayout background={plotConfig.background} viewBox={view}>
      <ChartPlot view={view} testId="vector-chart" title={plotConfig.title} />
    </ChartLayout>
  );
}
