import type { ControllerContainerContext } from '@/features/scene-view/api';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import { ProxyStatus } from '@/lib/binding/api';
import { useVectorChart } from '../graph/useVectorChart';
import { GraphToolbar } from '../graph/GraphToolbar';

function VectorChart({
  model,
  proxy,
}: {
  model: DisplayVectorGraphModel;
  proxy: ControllerContainerContext['proxy'];
}) {
  const { values, containerRef, selectionRef, tool, selectTool, reset } =
    useVectorChart({ model, proxy });

  return (
    <div
      className="flex h-full w-full min-w-0"
      style={{ backgroundColor: model.background }}
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        <div
          ref={containerRef}
          data-testid="vector-chart"
          className="relative h-full w-full min-w-0"
        />
        {model.title && (
          <div className="pointer-events-none absolute inset-x-0 top-0.5 text-center text-[13px] text-black">
            {model.title}
          </div>
        )}
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
      <GraphToolbar tool={tool} selectTool={selectTool} reset={reset} />
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
  const proxy = ctx?.proxy;
  const isOffline =
    (proxy?.root.status ?? ProxyStatus.OFFLINE) === ProxyStatus.OFFLINE;
  if (isOffline) {
    return (
      <div className="flex h-full w-full select-none items-center justify-center border border-slate-200 bg-slate-50 text-xs text-slate-500">
        Device offline
      </div>
    );
  }

  return <VectorChart model={model} proxy={proxy} />;
};

export default DisplayVectorGraph;
