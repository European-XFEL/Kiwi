import { useEffect } from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { stringFromHashType } from '@/karabo/data/string_converter';

const BINDING_TOOLTIP_DURATION_MS = 5000;

const BINDING_ATTRIBUTES = [
  'displayedName',
  'defaultValue',
  'valueType',
  'unitSymbol',
  'metricPrefixSymbol',
  'displayType',
  'minInc',
  'maxInc',
  'minExc',
  'maxExc',
  'options',
];

interface SceneBindingTooltipProps {
  proxy: PropertyProxy;
  clientX: number;
  clientY: number;
  onDismiss: () => void;
}

export function SceneBindingTooltip({
  proxy,
  clientX,
  clientY,
  onDismiss,
}: SceneBindingTooltipProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, BINDING_TOOLTIP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  if (!proxy.binding) {
    return null;
  }
  const { key } = proxy;
  const { attributes } = proxy.binding;
  const description = attributes.findValue('description');
  return (
    <Tooltip
      open
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        }
      }}
    >
      <TooltipTrigger asChild>
        <span
          aria-hidden
          tabIndex={-1}
          style={{
            position: 'fixed',
            left: clientX,
            top: clientY,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        />
      </TooltipTrigger>
      <TooltipContent
        hideArrow
        side="bottom"
        align="start"
        sideOffset={4}
        className="pointer-events-none max-w-[420px] rounded-none border border-[#b88700] bg-[#fff7bf] px-1.5 py-0.5 text-[11px] leading-tight text-black shadow-sm"
      >
        {description != null && description !== '' && (
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {stringFromHashType(description)}
          </p>
        )}
        <table>
          <tbody>
            <tr>
              <th className="pr-2 text-left font-normal">key</th>
              <td>{key}</td>
            </tr>
            {BINDING_ATTRIBUTES.map((attribute) => {
              if (attributes.findValue(attribute) == null) {
                return null;
              }
              return (
                <tr key={attribute}>
                  <th className="pr-2 text-left font-normal">{attribute}</th>
                  <td>{stringFromHashType(attributes.get(attribute))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TooltipContent>
    </Tooltip>
  );
}
