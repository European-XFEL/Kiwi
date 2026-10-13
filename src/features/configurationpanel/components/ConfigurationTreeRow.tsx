import {
  memo,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import type { NodeRendererProps, RowRendererProps } from 'react-arborist';
import icons from '@/assets/icons';
import { AccessLevel } from '@/karabo/data/api';
import { VectorHashBinding, type PropertyProxy } from '@/lib/binding/api';
import { SlotBinding } from '@/lib/binding/BaseBinding';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { deriveControllerModel } from '@/features/scene-view/api';
import { useGlobalStore } from '@/store/api';
import type { ConfigurationNode } from '../ConfigurationTreeModel';
import { ModelContext } from './ConfigurationTreeContext';
import { columns } from '../const';
import { useContentWidth } from '../hooks/useConfigurationColumns';
import { formatCurrentValue, getCurrentColor, getPropertyIcon } from '../utils';

const INDENT = 20;
const BUTTON_CLASSES =
  'inline-flex h-6 items-center justify-center rounded-[3px] border border-[#a0a0a0] bg-linear-to-b from-[#fafafa] to-[#e4e4e4] px-2 py-0.5 text-[#202020] font-normal tracking-normal [word-spacing:normal] shadow-[inset_0_1px_0_#fff] cursor-pointer enabled:hover:border-[#707070] enabled:hover:from-white enabled:hover:to-[#ebebeb] enabled:active:from-[#d8d8d8] enabled:active:to-[#ededed] enabled:active:shadow-[inset_0_1px_2px_#b8b8b8] focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-[#606060] focus-visible:outline-offset-[-4px] disabled:border-[#c4c4c4] disabled:from-[#f4f4f4] disabled:to-[#ebebeb] disabled:text-[#888] disabled:shadow-[inset_0_1px_0_#fafafa] disabled:cursor-default';

function stopButtonActivation(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.stopPropagation();
  }
}

const RowContent = memo(function RowContent({
  node,
  level,
  open,
  selected,
  focused,
  toggle,
}: {
  node: ConfigurationNode;
  level: number;
  open: boolean;
  selected: boolean;
  focused: boolean;
  toggle: () => void;
}) {
  const model = useContext(ModelContext)!;
  useSyncExternalStore(model.subscribeValues, model.getValueSnapshot);
  const [proxy, setProxy] = useState<PropertyProxy>();
  useLayoutEffect(() => {
    setProxy(node.getProxy());
  }, [node]);
  const access = useGlobalStore(
    (state) => state.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );
  const enabled = !!proxy?.root.isOnline && proxy.isExecutable(access);
  const binding = proxy?.binding ?? model.root?.getBinding(node.id);
  const slot = binding instanceof SlotBinding;
  const table = binding instanceof VectorHashBinding;
  const content = useContentWidth(node.id, 9 + level * INDENT);
  const timestamp = proxy?.timestamp;
  const rawValue = proxy?.value;
  // PropertyProxy mutates in place, so its live fields must invalidate the cache.
  const value = useMemo(
    () => (proxy ? formatCurrentValue(proxy) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proxy, binding, timestamp, rawValue]
  );
  let currentContent: ReactNode = null;
  if (table) {
    currentContent = (
      <button
        className={`${BUTTON_CLASSES} min-w-[50px]`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={stopButtonActivation}
      >
        Table
      </button>
    );
  } else if (value) {
    currentContent = (
      <span className="block w-full truncate text-center">{value}</span>
    );
  }
  return (
    <div
      style={columns}
      className={`h-full text-xs ${selected ? 'bg-accent' : ''} ${focused ? 'outline outline-1 outline-ring outline-offset-[-1px]' : ''}`}
    >
      <div
        className="flex min-w-0 items-center overflow-hidden border-b border-r pr-1"
        style={{ paddingLeft: 4 + level * INDENT }}
      >
        <div ref={content} className="flex w-full min-w-0 items-center gap-1">
          <span className="w-4 shrink-0">
            {node.children !== undefined && (
              <button
                tabIndex={-1}
                aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={stopButtonActivation}
              >
                <img
                  className="h-3 w-3"
                  src={open ? icons.arrowDown : icons.arrowRight}
                  alt=""
                />
              </button>
            )}
          </span>
          {slot ? (
            <button
              className={`${BUTTON_CLASSES} min-w-0 flex-1 truncate`}
              disabled={!enabled}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={stopButtonActivation}
              onClick={(event) => {
                event.stopPropagation();
                const currentAccess =
                  useGlobalStore.getState().sessionInfo?.accessLevel ??
                  AccessLevel.OBSERVER;
                if (proxy?.root.isOnline && proxy.isExecutable(currentAccess)) {
                  proxy.execute();
                }
              }}
            >
              <span
                data-slot-label
                className="min-w-0 truncate"
                title={node.name}
              >
                {node.name}
              </span>
            </button>
          ) : (
            <>
              <img
                className="h-4 w-4 shrink-0"
                src={getPropertyIcon(proxy?.binding)}
                alt=""
              />
              <span data-property-label className="truncate" title={node.name}>
                {node.name}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        data-testid="current-value"
        className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap border-b border-r px-1"
        style={{ backgroundColor: proxy ? getCurrentColor(proxy) : undefined }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!proxy) {
            return;
          }
          const controller = deriveControllerModel(proxy.binding);
          if (controller) {
            controller.keys = [proxy.key];
            broadcast_event(KaraboEvent.OpenControllerPanel, {
              model: controller,
            });
          }
        }}
        title={value}
      >
        {currentContent}
      </div>
      <div
        data-testid="edit-value"
        className="border-b"
        onDoubleClick={(event) => event.stopPropagation()}
      />
    </div>
  );
});

export function NodeRenderer({
  node,
  tree,
}: NodeRendererProps<ConfigurationNode>) {
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

export function RowRenderer({
  node,
  attrs,
  innerRef,
  children,
}: RowRendererProps<ConfigurationNode>) {
  return (
    <div
      {...attrs}
      ref={innerRef}
      className={`${attrs.className ?? ''} select-none`}
      onFocus={(event) => event.stopPropagation()}
      onClick={() => node.select()}
      onDoubleClick={() => {
        if (node.isInternal) {
          node.toggle();
        }
      }}
    >
      {children}
    </div>
  );
}
