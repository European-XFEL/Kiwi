import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { VectorBarGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { useVectorChart } from '../graph/plot/api';

export default function DisplayBarGraph({
  model,
  ctx,
}: {
  model: VectorBarGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const { containerRef, selectionRef, tool, selectTool, reset } =
    useVectorChart({ model, proxy: ctx?.proxy });

  return (
    <ChartLayout
      background={model.background}
      viewBox={{ tool, selectTool, reset }}
    >
      <ChartPlot
        containerRef={containerRef}
        selectionRef={selectionRef}
        testId="vector-chart"
        title={model.title}
      />
    </ChartLayout>
  );
}
