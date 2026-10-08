import type { ComponentType, CSSProperties } from 'react';
import { Hash, SimpleValueTypes } from '@/karabo/data/api';
import { BaseBinding } from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { openDeviceSceneLinkInWorkspace } from '@/features/project/api';
import { showMessageBox } from '@/lib/messagebox';
import { callDeviceSlot } from '@/lib/request';
import { get_reason_parts } from '@/lib/singletons/util';
import { formatTableCell } from './formatTableCell';
import type { getMinMax } from './getMinMax';
import { canAct } from './canAct';

export interface TableDelegate {
  Component?: ComponentType<DelegateProps>;
  getStyle?: (props: DelegateProps) => CSSProperties;
}

export interface DelegateProps {
  value: SimpleValueTypes;
  binding: BaseBinding;
  ctx?: ControllerContainerContext;
  rowData?: Hash;
  row?: number;
  column?: number;
  header?: string;
}

function progressFraction(
  value: SimpleValueTypes,
  [low, high]: ReturnType<typeof getMinMax>
): number | undefined {
  if (
    low == null ||
    high == null ||
    (typeof value !== 'number' && typeof value !== 'bigint')
  ) {
    return;
  }
  if (
    typeof low === 'bigint' &&
    typeof high === 'bigint' &&
    typeof value === 'bigint'
  ) {
    if (high <= low) {
      return;
    }
    if (value <= low) {
      return 0;
    }
    if (value >= high) {
      return 1;
    }
    return Number(value - low) / Number(high - low);
  }
  const min = Number(low);
  const max = Number(high);
  const current = Number(value);
  if (![min, max, current].every(Number.isFinite) || max <= min) {
    return;
  }
  const clamped = Math.min(max, Math.max(min, current));
  // Halving avoids overflow for the native double range.
  return Number.isFinite(max - min)
    ? (clamped - min) / (max - min)
    : (clamped / 2 - min / 2) / (max / 2 - min / 2);
}

export function ProgressBarDelegate({
  value,
  binding,
  limits,
}: DelegateProps & {
  limits: ReturnType<typeof getMinMax>;
}) {
  const fraction = progressFraction(value, limits);
  const text = formatTableCell(value, binding);
  if (fraction === undefined) {
    return <>{text}</>;
  }
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={fraction * 100}
      aria-valuetext={text}
      className="relative border border-gray-400 min-w-16 text-center"
    >
      <div
        className="absolute inset-y-0 left-0 bg-blue-300"
        style={{ width: `${fraction * 100}%` }}
      />
      <span className="relative">{text}</span>
    </div>
  );
}

export function TableButtonDelegate({
  caption,
  disabled,
  onClick,
}: {
  caption: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded border border-gray-400 bg-gray-100 px-2 disabled:text-gray-400 disabled:cursor-default hover:enabled:bg-gray-200"
    >
      {caption}
    </button>
  );
}

export function BoolButtonDelegate({
  value,
  binding,
  ctx,
  rowData,
  row,
  column,
  header,
}: DelegateProps) {
  const caption = binding.displayedName || ctx?.proxy?.path || '';
  const enabled = value === true && canAct(ctx);
  return (
    <TableButtonDelegate
      caption={caption}
      disabled={!enabled}
      onClick={() => {
        if (!enabled || !ctx?.proxy || !rowData || !canAct(ctx)) return;
        const parts = binding.displayType.split('|');
        const confirm =
          parts.length === 2 &&
          new URLSearchParams(parts[1]).get('confirmation') === '1';
        if (
          confirm &&
          !window.confirm(`Do you really want to proceed with "${caption}"?`)
        )
          return;
        if (!canAct(ctx)) return;
        callDeviceSlot(
          (success, reply) => {
            if (!success) {
              const reason =
                reply instanceof Hash && reply.has('reason')
                  ? reply.getValue('reason')
                  : String(reply);
              const [msg, details] = get_reason_parts(String(reason));
              showMessageBox({
                variant: 'error',
                title: 'Table action failed',
                msg,
                details,
              });
            } else if (
              reply instanceof Hash &&
              reply.has('payload.success') &&
              reply.getValue('payload.success') === false
            ) {
              const reason = reply.has('payload.reason')
                ? reply.getValue('payload.reason')
                : '';
              showMessageBox({
                variant: 'error',
                title: 'Table action failed',
                msg: String(reason),
              });
            }
          },
          ctx.proxy.root.deviceId,
          'requestAction',
          {
            action: 'TableButton',
            path: ctx.proxy.path,
            table: new Hash({ rowData, row, column, header }),
          }
        );
      }}
    />
  );
}

function openTableLink(value: SimpleValueTypes): void {
  if (typeof value !== 'string') return;
  const divider = value.indexOf('|');
  if (divider < 0) return;
  const scheme = value.slice(0, divider);
  const target = value.slice(divider + 1);
  if (scheme === 'url') {
    try {
      const url = new URL(target);
      if (url.protocol === 'http:' || url.protocol === 'https:')
        window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      /* Malformed links have no action. */
    }
  } else if (scheme === 'deviceScene') {
    const options = new URLSearchParams(target);
    const deviceId = options.get('device_id');
    if (deviceId)
      void openDeviceSceneLinkInWorkspace(
        deviceId,
        options.get('name') || undefined
      );
  }
}

export function StringButtonDelegate({ value, binding, ctx }: DelegateProps) {
  const caption = binding.displayedName || ctx?.proxy?.path || '';
  return (
    <TableButtonDelegate
      caption={caption}
      disabled={!canAct(ctx)}
      onClick={() => {
        if (canAct(ctx)) openTableLink(value);
      }}
    />
  );
}
