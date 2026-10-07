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
  const ySeries = useVectorSeries({
    proxies: ctx?.proxies ?? [],
    keys: model.keys,
  });
  const plotWindow = useVectorChart({ plotConfig, ySeries });

  return (
    <ChartLayout background={plotConfig.background} viewBox={plotWindow}>
      <ChartPlot
        view={plotWindow}
        testId="vector-chart"
        title={plotConfig.title}
        legend={
          <ChartLegend
            keys={ySeries.map((item) => item.key)}
            view={plotWindow}
          />
        }
      />
    </ChartLayout>
  );
}
