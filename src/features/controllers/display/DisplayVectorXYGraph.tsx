import { type VectorXYGraphModel, buildModelConfig } from '@/karabo/common/api';
import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';

import {
  ChartLayout,
  ChartPlot,
  ChartLegend,
  useVectorSeries,
  usePlotChart,
} from '../graph/api';

const emptyVector = new Float64Array();

export default function DisplayVectorXYGraph({
  model,
  ctx,
}: {
  model: VectorXYGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const published = useVectorSeries({
    proxies: ctx?.proxies ?? [],
    keys: model.keys,
  });
  const { xValues, ySeries } = React.useMemo(
    () => ({
      xValues: published[0]?.values ?? emptyVector,
      ySeries: published.slice(1),
    }),
    [published]
  );
  const plotWindow = usePlotChart({ plotConfig, xValues, ySeries });
  return (
    <ChartLayout background={plotConfig.background} viewBox={plotWindow}>
      <ChartPlot
        view={plotWindow}
        testId="vector-xy-chart"
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
