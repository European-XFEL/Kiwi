import * as React from 'react';
import type { PropertyProxies } from '../utils/controller_proxies';
import { ProxyStatus } from '@/lib/binding/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/api';
import { XIcon } from 'lucide-react';

const STATUS_INDICATOR_ICON: Partial<Record<ProxyStatus, string>> = {
  [ProxyStatus.ONLINEREQUESTED]: 'bg-yellow-400',
  [ProxyStatus.SCHEMA]: 'bg-blue-500',
};

const TOOLTIP_CONTENT_CLASSNAME =
  'max-w-[420px] rounded-none border border-[#b88700] bg-[#fff7bf] px-1.5 py-0.5 text-[11px] leading-tight text-black shadow-sm';

const TOOLTIP_DELAY = 1500;

export interface ControllerOverlayProps {
  proxies: PropertyProxies;
  children: React.ReactNode;
}

export const ControllerOverlay: React.FC<ControllerOverlayProps> = React.memo(
  ({ proxies, children }) => {
    // XXX: proxy might be undefined
    const proxy = proxies[0];
    const proxyStatus = proxy?.root.status ?? ProxyStatus.OFFLINE;
    const toolTipText = proxies
      .map((propertyProxy) => propertyProxy.key)
      .join(', ');

    const indicatorIcon = STATUS_INDICATOR_ICON[proxyStatus];
    const showOfflineOverlay = proxyStatus === ProxyStatus.OFFLINE;
    const showStatusIndicator = !!indicatorIcon;
    const showMissingBadge =
      !showOfflineOverlay && proxy?.binding_existing === false;

    return (
      <div className="relative w-full h-full">
        {children}
        {/* Healthy widgets keep their own hover target so the overlay does not shadow them. */}
        {/* OFFLINE — red glass with XIcon */}
        {showOfflineOverlay && (
          <Tooltip delayDuration={TOOLTIP_DELAY}>
            <TooltipTrigger asChild>
              <div
                data-testid="offline-overlay"
                className="absolute inset-0 p-1 rounded bg-red-100/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto border border-red-300 shadow-sm"
              >
                <XIcon
                  size={30}
                  strokeWidth={1.6}
                  className="text-red-600"
                  absoluteStrokeWidth
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              hideArrow
              side="bottom"
              align="start"
              sideOffset={4}
              className={TOOLTIP_CONTENT_CLASSNAME}
            >
              {toolTipText}
            </TooltipContent>
          </Tooltip>
        )}

        {/* STATUS INDICATOR — small status ball */}
        {showStatusIndicator && (
          <Tooltip delayDuration={TOOLTIP_DELAY}>
            <TooltipTrigger asChild>
              <div className="absolute top-2 right-2 pointer-events-auto">
                <div
                  data-testid="connecting-indicator"
                  className={`h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-white/70 ${indicatorIcon}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              hideArrow
              side="bottom"
              align="start"
              sideOffset={4}
              className={TOOLTIP_CONTENT_CLASSNAME}
            >
              {toolTipText}
            </TooltipContent>
          </Tooltip>
        )}

        {/* PROPERTY MISSING — transparent overlay with green question mark */}
        {showMissingBadge && (
          <Tooltip delayDuration={TOOLTIP_DELAY}>
            <TooltipTrigger asChild>
              <div
                data-testid="missing-property-badge"
                className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10 bg-transparent"
              >
                <span className="text-green-500 font-black text-4xl leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
                  ?
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              hideArrow
              side="bottom"
              align="start"
              sideOffset={4}
              className={TOOLTIP_CONTENT_CLASSNAME}
            >
              {toolTipText}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }
);

ControllerOverlay.displayName = 'ControllerOverlay';
