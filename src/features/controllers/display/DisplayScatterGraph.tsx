import React from 'react';
import { buildModelConfig } from '../graph/common/api';
import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { ScatterGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { usePlotChart } from '../graph/usePlotChart';
import { useScatterData } from '../graph/useScatterData';

export default function DisplayScatterGraph({
  model,
  ctx,
}: {
  model: ScatterGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const { xValues, ySeries, clear } = useScatterData({
    proxies: ctx?.proxies ?? [],
    keys: model.keys,
    maxlen: plotConfig.maxlen,
  });
  const plotWindow = usePlotChart({
    plotConfig,
    xValues,
    ySeries,
    kind: 'scatter',
  });
  return (
    <ChartLayout
      background={plotConfig.background}
      viewBox={plotWindow}
      controls={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear points"
          title="Clear points"
          className="h-7 w-7 rounded-sm"
          onClick={clear}
        >
          <span aria-hidden="true">×</span>
        </Button>
      }
    >
      <ChartPlot
        view={plotWindow}
        testId="scatter-chart"
        title={plotConfig.title}
      />
    </ChartLayout>
  );
}
