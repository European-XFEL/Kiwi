import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import type { PropertyProxies } from '../utils/controller_proxies';
import { ProxyStatus } from '@/lib/binding/api';
import { XIcon } from 'lucide-react';
import type { ControllerIndicator } from '../utils/controller_semantics';

const CONNECTING_STATUSES: ProxyStatus[] = [
  ProxyStatus.ONLINEREQUESTED,
  ProxyStatus.SCHEMA,
  ProxyStatus.ALIVE,
];

const PHASE_DURATION_MS = 800;

export interface ControllerOverlayProps {
  proxy: PropertyProxies[number] | undefined;
  children: React.ReactNode;
  tooltipText?: string;
  indicator?: ControllerIndicator;
  showMissingPropertyOverlay?: boolean;
}

export const ControllerOverlay: React.FC<ControllerOverlayProps> = React.memo(
  ({
    proxy,
    children,
    tooltipText,
    indicator,
    showMissingPropertyOverlay = false,
  }) => {
    const bindingLabel = indicator?.bindingLabel;
    const missingPropertyIndicator = indicator?.missingPropertyIndicator;
    const tooltipLabel = tooltipText ?? bindingLabel;
    const deviceId = proxy?.root.deviceId;
    const propertyPath = proxy?.path;
    const proxyStatus = proxy?.root.status ?? ProxyStatus.OFFLINE;

    const isOffline = proxyStatus === ProxyStatus.OFFLINE;
    const isConnecting = CONNECTING_STATUSES.includes(proxyStatus);
    const isHealthy = proxyStatus === ProxyStatus.MONITORING;
    const hasPropertyKey = Boolean(deviceId && propertyPath);

    const [phase, setPhase] = React.useState<number | null>(null);
    const hasEverConnected = React.useRef(false);

    React.useEffect(() => {
      if (isHealthy && !hasEverConnected.current) {
        hasEverConnected.current = true;
        setPhase(0);
      }
      if (proxyStatus === ProxyStatus.OFFLINE) {
        hasEverConnected.current = false;
        setPhase(null);
      }
    }, [isHealthy, proxyStatus]);

    React.useEffect(() => {
      if (phase === null) return;

      if (phase >= 3) {
        const timer = setTimeout(() => setPhase(null), 400);
        return () => clearTimeout(timer);
      }

      const timer = setTimeout(
        () => setPhase((p) => (p === null ? null : p + 1)),
        PHASE_DURATION_MS
      );
      return () => clearTimeout(timer);
    }, [phase]);

    const showMissingBadge =
      hasPropertyKey &&
      showMissingPropertyOverlay &&
      !isOffline &&
      !!missingPropertyIndicator;
    const shouldRenderOverlay =
      hasPropertyKey &&
      (isOffline || isConnecting || phase !== null || !!showMissingBadge);

    // Choose color class without nested ternary
    let indicatorColorClass: string | undefined;
    if (phase === 0) {
      indicatorColorClass = 'bg-yellow-400';
    } else if (phase === 1) {
      indicatorColorClass = 'bg-blue-500';
    } else if (phase === 2) {
      indicatorColorClass = 'bg-emerald-500';
    }

    return (
      <div className="relative w-full h-full">
        {children}
        {/* Healthy widgets keep their own hover target so the overlay does not shadow them. */}
        {/* OFFLINE — red glass with XIcon */}
        {shouldRenderOverlay && isOffline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute inset-0 p-1 rounded bg-red-100/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-help border border-red-300 shadow-sm">
                <XIcon
                  size={30}
                  strokeWidth={1.6}
                  className="text-red-600"
                  absoluteStrokeWidth
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-gray-900 text-white border-gray-800 shadow-xl"
            >
              <div className="text-center py-1">
                <p className="font-semibold text-sm">
                  {tooltipLabel ?? deviceId}
                </p>
                <p className="text-xs opacity-90 mt-1">
                  Device is offline — no live data
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* CONNECTING ANIMATION — 3-phase pulse */}
        {shouldRenderOverlay &&
          phase !== null &&
          phase < 3 &&
          indicatorColorClass && (
            <div className="absolute top-2 right-2 pointer-events-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-3 w-3 rounded-full shadow-md ring-2 ring-white/50 ${indicatorColorClass} animate-pulse`}
                    style={{
                      animation:
                        'pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="bg-gray-900 text-white border-gray-800"
                >
                  <p className="font-medium text-xs">
                    {tooltipLabel ?? deviceId}
                  </p>
                  <p className="text-xs opacity-90">
                    {phase === 0 && 'Connecting...'}
                    {phase === 1 && 'Loading configuration...'}
                    {phase === 2 && 'Ready'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

        {/* PROPERTY MISSING — Amber badge */}
        {shouldRenderOverlay &&
          showMissingBadge &&
          missingPropertyIndicator && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-3 py-1.5 bg-amber-50/95 border border-amber-600 rounded shadow-md cursor-help backdrop-blur-sm">
                    <span className="text-amber-900 font-mono font-bold text-xs tracking-wider">
                      {typeof missingPropertyIndicator.indicator === 'string'
                        ? missingPropertyIndicator.indicator
                        : '??'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-gray-900 text-white border-gray-800 max-w-xs"
                >
                  {tooltipLabel ? (
                    <p className="text-xs leading-relaxed">{tooltipLabel}</p>
                  ) : (
                    <p className="text-xs leading-relaxed">
                      Property{' '}
                      <code className="font-mono bg-amber-900/30 px-1 rounded">
                        {propertyPath}
                      </code>{' '}
                      not found in device configuration.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
      </div>
    );
  }
);

ControllerOverlay.displayName = 'ControllerOverlay';
