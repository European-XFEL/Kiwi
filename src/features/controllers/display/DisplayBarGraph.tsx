import React from 'react';
import { buildModelConfig } from '../graph/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorBarGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { usePlotChart } from '../graph/usePlotChart';
import { generateBaseline } from '../graph/utils';
import { useVectorSeries } from '../graph/useVectorSeries';

export default function DisplayBarGraph({
  model,
  ctx,
}: {
  model: VectorBarGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const ySeries = useVectorSeries({
    proxies: [ctx?.proxy],
    keys: [model.keys[0] ?? ''],
  });
  const length = ySeries[0].values.length;
  const xValues = React.useMemo(
    () => generateBaseline({ length }, 0, 1),
    [length]
  );
  const plotWindow = usePlotChart({
    plotConfig,
    xValues,
    ySeries,
    kind: 'bar',
  });

  return (
    <ChartLayout background={plotConfig.background} viewBox={plotWindow}>
      <ChartPlot
        view={plotWindow}
        testId="vector-chart"
        title={plotConfig.title}
      />
    </ChartLayout>
  );
}
