import { Button } from '@/components/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { ScatterGraphModel } from '@/karabo/common/api';
import { ChartLayout, ChartPlot } from '../graph/common/api';
import { useScatterChart } from '../graph/scatter/useScatterChart';

export default function DisplayScatterGraph({
  model,
  ctx,
}: {
  model: ScatterGraphModel;
  ctx?: ControllerContainerContext;
}) {
  const view = useScatterChart({ model, proxies: ctx?.proxies ?? [] });
  return (
    <ChartLayout
      background={model.background}
      viewBox={view}
      controls={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear points"
          title="Clear points"
          className="h-7 w-7 rounded-sm"
          onClick={view.clear}
        >
          <span aria-hidden="true">×</span>
        </Button>
      }
    >
      <ChartPlot
        containerRef={view.containerRef}
        selectionRef={view.selectionRef}
        testId="scatter-chart"
        title={model.title}
      />
    </ChartLayout>
  );
}
