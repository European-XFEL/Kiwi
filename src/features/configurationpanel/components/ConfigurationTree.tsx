import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Tree, type NodeApi, type TreeApi } from 'react-arborist';
import type {
  ConfigurationTreeModel,
  ConfigurationNode,
} from '../ConfigurationTreeModel';
import { ColumnWidthContext, ModelContext } from './ConfigurationTreeContext';
import ConfigurationTreeHeader from './ConfigurationTreeHeader';
import { NodeRenderer, RowRenderer } from './ConfigurationTreeRow';
import { ROW_HEIGHT } from '../const';
import { useConfigurationColumns } from '../hooks/useConfigurationColumns';

export default function ConfigurationTree({
  model,
  data,
}: {
  model: ConfigurationTreeModel;
  data: ConfigurationNode[];
}) {
  const tree = useRef<TreeApi<ConfigurationNode>>(null);
  const focused = useRef<NodeApi<ConfigurationNode> | null>(null);
  const { viewport, size, reportWidth, widths, maxima, onResize } =
    useConfigurationColumns({ data, schemaRevision: model.schemaRevision });
  useLayoutEffect(() => {
    const api = tree.current;
    if (!api) {
      return;
    }
    for (const id of api.selectedIds) {
      if (!model.getNode(id)) {
        api.deselect(id);
      }
    }
    if (focused.current && !model.getNode(focused.current.id)) {
      let ancestor = focused.current.parent;
      while (ancestor && !model.getNode(ancestor.id)) {
        ancestor = ancestor.parent;
      }
      focused.current = ancestor;
      if (api.hasFocus && ancestor) {
        api.focus(ancestor.id, { scroll: false });
      } else if (api.hasFocus) {
        viewport.current
          ?.querySelector<HTMLElement>('[role="tree"]')
          ?.focus({ preventScroll: true });
      }
    }
  }, [data, model, viewport]);
  return (
    <ModelContext.Provider value={model}>
      <ColumnWidthContext.Provider value={reportWidth}>
        <div
          data-configuration-tree
          className="flex min-h-0 flex-1 flex-col"
          style={
            {
              '--configuration-property-width': `${widths[0]}px`,
              '--configuration-value-width': `${widths[1]}px`,
            } as CSSProperties
          }
        >
          <ConfigurationTreeHeader
            widths={widths}
            maxima={maxima}
            onResize={onResize}
          />
          <div ref={viewport} className="min-h-0 flex-1 overflow-hidden">
            <Tree<ConfigurationNode>
              ref={tree}
              data={data}
              width={size.width}
              height={size.height}
              rowHeight={ROW_HEIGHT}
              openByDefault={false}
              disableMultiSelection
              disableEdit
              disableDrag
              disableDrop
              renderRow={RowRenderer}
              onFocus={(node) => {
                focused.current = node;
              }}
              aria-label="Device configuration"
            >
              {NodeRenderer}
            </Tree>
          </div>
        </div>
      </ColumnWidthContext.Provider>
    </ModelContext.Provider>
  );
}
