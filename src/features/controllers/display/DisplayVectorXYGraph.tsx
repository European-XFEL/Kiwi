import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorXYGraphModel } from '@/karabo/common/api';
import {
  buildModelConfig,
  ChartLayout,
  ChartPlot,
  ChartLegend,
} from '../graph/common/api';
import { useVectorSeries } from '../graph/useVectorSeries';
import { usePlotChart } from '../graph/usePlotChart';

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
