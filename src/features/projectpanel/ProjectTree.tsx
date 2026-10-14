import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Tree,
  type NodeRendererProps,
  type RowRendererProps,
  type TreeApi,
} from 'react-arborist';
import icons from '@/assets/icons';
import { asLocalDateTimeString } from '@/karabo/common/project/api';
import type {
  ProjectItemModel,
  ProjectSnapshot,
  ProjectTreeNode,
} from '@/lib/singletons/ProjectItemModel';
import { openSceneInWorkspace } from '@/features/project/api';
import SceneContextMenu from './SceneContextMenu';

const ROW_HEIGHT = 20;
const INDENT = 20;

function NodeRenderer({ node }: NodeRendererProps<ProjectTreeNode>) {
  const data = node.data;
  let icon = icons.folder;
  if (data.kind === 'scene') {
    icon = icons.image;
  } else if (data.kind === 'project' && data.model.is_trashed) {
    icon = icons.folderTrash;
  }
  const isModel = data.kind === 'project' || data.kind === 'scene';
  const tooltip = isModel
    ? `${data.name}\nUUID: ${data.model.uuid}\nLast modified: ${data.model.date ? asLocalDateTimeString(data.model.date) : ''}`
    : data.name;
  return (
    <div
      title={tooltip}
      className={`flex h-full min-w-0 w-full items-center overflow-hidden text-sm ${node.isSelected ? 'bg-accent text-accent-foreground' : ''} ${node.isFocused ? 'outline outline-1 outline-ring outline-offset-[-1px]' : ''}`}
    >
      <span
        className="flex min-w-0 flex-1 items-center gap-1 pr-2"
        style={{ marginLeft: 8 + node.level * INDENT }}
      >
        <span
          className="inline-flex w-4 shrink-0 justify-center"
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {data.children && data.children.length > 0 && (
            <button
              className="flex h-4 w-4 cursor-pointer items-center justify-center"
              tabIndex={-1}
              aria-label={`${node.isOpen ? 'Collapse' : 'Expand'} ${data.name}`}
              onClick={(event) => {
                event.stopPropagation();
                node.toggle();
              }}
            >
              <img
                className="h-3 w-3"
                src={node.isOpen ? icons.arrowDown : icons.arrowRight}
                alt=""
                draggable={false}
              />
            </button>
          )}
        </span>
        <img className="h-4 w-4 shrink-0" src={icon} alt="" draggable={false} />
        <span
          className={`min-w-0 flex-1 truncate ${data.kind === 'project' ? 'font-bold' : ''}`}
        >
          {data.name}
        </span>
      </span>
    </div>
  );
}

function RowRenderer({
  node,
  attrs,
  innerRef,
  children,
}: RowRendererProps<ProjectTreeNode>) {
  const row = (
    <div
      {...attrs}
      style={{ ...attrs.style, minWidth: 0 }}
      className={`${attrs.className ?? ''} cursor-pointer select-none`}
      ref={innerRef}
      onFocus={(event) => event.stopPropagation()}
      onClick={() => node.select()}
      onContextMenu={() => node.select()}
      onDoubleClick={() => {
        if (node.isInternal && node.data.children!.length > 0) {
          node.toggle();
        } else {
          node.activate();
        }
      }}
    >
      {children}
    </div>
  );
  if (node.data.kind === 'scene') {
    return <SceneContextMenu scene={node.data.model}>{row}</SceneContextMenu>;
  }
  return row;
}

export default function ProjectTree({
  model,
  snapshot,
}: {
  model: ProjectItemModel;
  snapshot: ProjectSnapshot;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const tree = useRef<TreeApi<ProjectTreeNode>>(null);
  const focusedNode = useRef<ProjectTreeNode | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const collect = (nodes: ProjectTreeNode[]) => {
      for (const node of nodes) {
        if (node.children) {
          if (node.kind !== 'project') {
            counts.set(node.id, node.children.length);
          }
          collect(node.children);
        }
      }
    };
    collect(snapshot.nodes);
    return counts;
  }, [snapshot]);
  const previousCounts = useRef(itemCounts);
  const [initialOpenState] = useState(() => {
    const open = Object.fromEntries(
      [...itemCounts].map(([id, count]) => [id, count > 0])
    );
    const root = snapshot.nodes[0];
    if (root) {
      open[root.id] = true;
    }
    return open;
  });

  useLayoutEffect(() => {
    const element = viewport.current!;
    const measure = (width: number, height: number) => {
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      );
    };
    measure(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width, entry.contentRect.height)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const api = tree.current;
    if (!api) {
      return;
    }
    // KaraboGUI expands group indexes when their first item is added; project
    // rows remain collapsed until opened. Preserve a
    // manual collapse when further items are appended to a populated group.
    for (const [id, count] of itemCounts) {
      if (count > 0 && !previousCounts.current.get(id)) {
        api.open(id);
      }
    }
    previousCounts.current = itemCounts;
    for (const id of api.selectedIds) {
      if (!model.getNode(id)) {
        api.deselect(id);
      }
    }
    let focused = focusedNode.current;
    if (!focused || model.getNode(focused.id)) {
      return;
    }
    while (focused && !model.getNode(focused.id)) {
      focused = focused.parent;
    }
    focusedNode.current = focused;
    if (focused && api.hasFocus) {
      api.focus(focused.id, { scroll: false });
    } else if (api.hasFocus) {
      viewport.current
        ?.querySelector<HTMLElement>('[role="tree"]')
        ?.focus({ preventScroll: true });
    }
  }, [itemCounts, model, snapshot]);

  return (
    <div
      ref={viewport}
      className="h-full min-h-0 w-full overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          tree.current?.selectedNodes[0]?.activate();
        }
      }}
    >
      <Tree<ProjectTreeNode>
        ref={tree}
        data={snapshot.nodes}
        width={size.width}
        height={size.height}
        rowHeight={ROW_HEIGHT}
        indent={INDENT}
        openByDefault={false}
        initialOpenState={initialOpenState}
        disableMultiSelection
        disableDrag
        disableDrop
        disableEdit
        renderRow={RowRenderer}
        onFocus={(node) => {
          focusedNode.current = node.data;
        }}
        onActivate={(node) => {
          const selected = model.getNode(node.id);
          if (selected?.kind === 'scene') {
            openSceneInWorkspace({ model: selected.model });
          }
        }}
        aria-label="Projects"
      >
        {NodeRenderer}
      </Tree>
    </div>
  );
}
