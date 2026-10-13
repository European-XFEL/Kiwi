import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Tree,
  type NodeApi,
  type NodeRendererProps,
  type RowRendererProps,
  type TreeApi,
} from 'react-arborist';
import icons from '@/assets/icons';
import { SystemTree, SystemTreeNode } from '@/lib/topology/SystemTree';
import {
  activate,
  getDecorationIcon,
  getStaticIcons,
  initializeMonitoring,
} from './utils';
import useTopologyMonitoring from './useTopologyMonitoring';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { getTopology } from '@/lib/singletons/api';

const ROW_HEIGHT = 20;
const INDENT = 20;

function Icon({ src, alt }: { src: string | undefined; alt: string }) {
  return src ? (
    <img className="h-4 w-4 shrink-0" src={src} alt={alt} draggable={false} />
  ) : null;
}

const DeviceDecoration = memo(function DeviceDecoration({
  node,
  status,
}: {
  node: SystemTreeNode;
  status: boolean;
}) {
  const getIconSnapshot = useCallback(
    () => getDecorationIcon(node, status),
    [node, status]
  );
  const src = useSyncExternalStore(node.subscribeDecoration, getIconSnapshot);
  return <Icon src={src} alt={status ? 'Instance status' : 'Device type'} />;
});

const RowContent = memo(function RowContent({
  node,
  level,
  open,
  selected,
  focused,
  toggle,
}: {
  node: SystemTreeNode;
  level: number;
  open: boolean;
  selected: boolean;
  focused: boolean;
  toggle: () => void;
}) {
  const isInstance = node.kind === 'device' || node.kind === 'macro';
  const staticIcons = useMemo(() => getStaticIcons(node), [node]);
  useLayoutEffect(() => initializeMonitoring(node), [node]);
  return (
    <div
      className={`flex h-full items-center text-sm ${selected ? 'bg-accent text-accent-foreground' : ''} ${focused ? 'outline outline-1 outline-ring outline-offset-[-1px]' : ''}`}
    >
      <span className="flex w-7 shrink-0 justify-center">
        {isInstance ? (
          <DeviceDecoration node={node} status />
        ) : (
          <Icon
            src={staticIcons.language}
            alt={String(node.attributes.findValue('lang') ?? '')}
          />
        )}
      </span>
      <span
        className="flex items-center gap-1 whitespace-nowrap pr-2"
        style={{ marginLeft: 8 + level * INDENT }}
      >
        <span
          className="inline-flex w-4 shrink-0 justify-center"
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {!isInstance && (
            <button
              className="flex h-4 w-4 cursor-pointer items-center justify-center"
              tabIndex={-1}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              <img
                className="h-3 w-3"
                src={open ? icons.arrowDown : icons.arrowRight}
                alt=""
                draggable={false}
              />
            </button>
          )}
        </span>
        {isInstance ? (
          <DeviceDecoration node={node} status={false} />
        ) : (
          <Icon src={staticIcons.type} alt={`${node.kind} type`} />
        )}
        <span>{node.name}</span>
      </span>
    </div>
  );
});

/** Arborist may replace NodeApi and positioning props; row content uses model identity. */
function NodeRenderer({ node, tree }: NodeRendererProps<SystemTreeNode>) {
  const id = node.id;
  const toggle = useCallback(() => tree.toggle(id), [tree, id]);
  return (
    <RowContent
      node={node.data}
      level={node.level}
      open={node.isOpen}
      selected={node.isSelected}
      focused={node.isFocused}
      toggle={toggle}
    />
  );
}

function RowRenderer({
  node,
  attrs,
  innerRef,
  children,
}: RowRendererProps<SystemTreeNode>) {
  return (
    <div
      {...attrs}
      className={`${attrs.className ?? ''} cursor-pointer select-none`}
      ref={innerRef}
      onFocus={(event) => event.stopPropagation()}
      onClick={() => node.select()}
      onDoubleClick={() => {
        if (node.isInternal) {
          node.toggle();
        } else {
          node.activate();
        }
      }}
    >
      {children}
    </div>
  );
}

function SystemTopologyTree({ model }: { model: SystemTree }) {
  const data = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const viewport = useRef<HTMLDivElement>(null);
  const tree = useRef<TreeApi<SystemTreeNode>>(null);
  useTopologyMonitoring(tree, model);
  const focusedNode = useRef<SystemTreeNode | null>(null);
  const expanded = useRef(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onFocus = useCallback((node: NodeApi<SystemTreeNode>) => {
    focusedNode.current = node.data;
  }, []);

  useLayoutEffect(() => {
    const element = viewport.current!;
    const measure = (width: number, height: number) => {
      setSize((size) =>
        size.width === width && size.height === height
          ? size
          : { width, height }
      );
    };
    measure(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      measure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const api = tree.current;
    if (!api) {
      return;
    }
    const surviving = new Set<string>();
    model.visit((node) => {
      surviving.add(node.id);
    });
    for (const id of api.selectedIds) {
      if (!surviving.has(id)) {
        api.deselect(id);
      }
    }
    let focused = focusedNode.current;
    if (!focused || surviving.has(focused.id)) {
      return;
    }
    while (focused && !surviving.has(focused.id)) {
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
  }, [data, model]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div
        className="flex h-6 shrink-0 cursor-pointer select-none items-center border-b bg-muted text-xs"
        onDoubleClick={() => {
          if (expanded.current) {
            tree.current?.closeAll();
          } else {
            tree.current?.openAll();
          }
          expanded.current = !expanded.current;
        }}
      >
        <span className="h-full w-7 shrink-0 border-r" />
        <span className="pl-1">Host - Server - Class - Device</span>
      </div>
      <div ref={viewport} className="min-h-0 w-full flex-1 overflow-hidden">
        <Tree<SystemTreeNode>
          ref={tree}
          data={data}
          width={size.width}
          height={size.height}
          rowHeight={ROW_HEIGHT}
          indent={INDENT}
          openByDefault
          disableMultiSelection
          disableDrag
          disableDrop
          disableEdit
          renderRow={RowRenderer}
          onActivate={activate}
          onFocus={onFocus}
          onSelect={(nodes) => {
            const selected = nodes[0];
            if (
              selected?.data.kind === 'device' ||
              selected?.data.kind === 'macro'
            ) {
              broadcast_event(KaraboEvent.ShowConfiguration, {
                proxy: getTopology().getDevice(selected.id),
              });
            }
          }}
          aria-label="System topology"
        >
          {NodeRenderer}
        </Tree>
      </div>
    </div>
  );
}

export default memo(SystemTopologyTree);
