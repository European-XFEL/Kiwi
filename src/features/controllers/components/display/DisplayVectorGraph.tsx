import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import { useDisplayVectorGraph } from '../../hooks/useDisplayVectorGraph';
import { useVectorChart } from '../../hooks/useVectorChart';
import { useVectorGraphView } from '../../hooks/useVectorGraphView';
import { GraphToolbar } from './GraphToolbar';

function VectorChart({
  model,
  values,
  indices,
}: {
  model: DisplayVectorGraphModel;
  values: number[];
  indices: number[];
}) {
  const view = useVectorGraphView();
  const { containerRef, selectionRef } = useVectorChart({
    model,
    values,
    indices,
    view,
  });

  return (
    <div
      className="flex h-full w-full min-w-0"
      style={{ backgroundColor: model.background }}
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        <div
          ref={containerRef}
          data-testid="vector-chart"
          className="h-full w-full"
        />
        <div
          ref={selectionRef}
          data-testid="vector-zoom-selection"
          className="pointer-events-none absolute hidden border border-slate-300 bg-slate-200/30"
        />
        {values.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            No vector data
          </div>
        )}
      </div>
      <GraphToolbar
        tool={view.tool}
        selectTool={view.selectTool}
        reset={view.reset}
      />
    </div>
  );
}

const DisplayVectorGraph = ({
  model,
  ctx,
}: {
  model: DisplayVectorGraphModel;
  ctx?: ControllerContainerContext;
}) => {
  const { vectorData, indices, isOffline } = useDisplayVectorGraph(ctx?.proxy);

  if (isOffline) {
    return (
      <div className="flex h-full w-full select-none items-center justify-center border border-slate-200 bg-slate-50 text-xs text-slate-500">
        Device offline
      </div>
    );
  }

  return <VectorChart model={model} values={vectorData} indices={indices} />;
};

export default DisplayVectorGraph;
