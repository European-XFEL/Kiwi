import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorScatterGraphModel } from '@/karabo/common/api';
import { buildModelConfig, ChartLayout, ChartPlot } from '../graph/common/api';
import { useVectorSeries } from '../graph/useVectorSeries';
import { usePlotChart } from '../graph/usePlotChart';

const emptyVector = new Float64Array();

export default function DisplayVectorScatterGraph({
  model,
  ctx,
}: {
  model: VectorScatterGraphModel;
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
  const plotWindow = usePlotChart({
    plotConfig,
    xValues,
    ySeries,
    kind: 'scatter-line',
  });
  return (
    <ChartLayout background={plotConfig.background} viewBox={plotWindow}>
      <ChartPlot
        view={plotWindow}
        testId="vector-scatter-chart"
        title={plotConfig.title}
      />
    </ChartLayout>
  );
}
