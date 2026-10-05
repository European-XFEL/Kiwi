import React from 'react';
import { buildModelConfig } from '../graph/common/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorBarGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { useVectorBarChart } from '../graph/useVectorBarChart';

export default function DisplayBarGraph({
  model,
  ctx,
}: {
  model: VectorBarGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const { containerRef, selectionRef, tool, selectTool, reset } =
    useVectorBarChart({ plotConfig, proxy: ctx?.proxy });

  return (
    <ChartLayout
      background={plotConfig.background}
      viewBox={{ tool, selectTool, reset }}
    >
      <ChartPlot
        containerRef={containerRef}
        selectionRef={selectionRef}
        testId="vector-chart"
        title={plotConfig.title}
      />
    </ChartLayout>
  );
}
