import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import type { UseDevicePropertyResult } from '@/components/shared/hooks/useDeviceProperty';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';
import { XIcon } from 'lucide-react';

const CONNECTING_STATUSES: ProxyStatus[] = [
  ProxyStatus.SCHEMA_REQUESTED,
  ProxyStatus.SCHEMA_RECEIVED,
];

const PHASE_DURATION_MS = 800;

export interface PropertyOverlayProps {
  primary: UseDevicePropertyResult;
  x: number;
  y: number;
  width: number;
  height: number;
  showMissingPropertyOverlay?: boolean;
}

export const PropertyOverlay: React.FC<PropertyOverlayProps> = React.memo(
  ({ primary, x, y, width, height, showMissingPropertyOverlay = false }) => {
    const {
      deviceId,
      propertyPath,
      proxyStatus,
      propertyStatus,
      propertyIndicator,
    } = primary;

    if (!deviceId || !propertyPath) return null;

    const isOffline = proxyStatus === ProxyStatus.OFFLINE;
    const isConnecting = CONNECTING_STATUSES.includes(proxyStatus);
    const isHealthy = proxyStatus === ProxyStatus.MONITORING;

    const [phase, setPhase] = React.useState<number | null>(null);
    const hasEverConnected = React.useRef(false);

    React.useEffect(() => {
      if (isHealthy && !hasEverConnected.current) {
        hasEverConnected.current = true;
        setPhase(0);
      }
      if (isOffline || proxyStatus === ProxyStatus.UNKNOWN) {
        hasEverConnected.current = false;
        setPhase(null);
      }
    }, [isHealthy, isOffline, proxyStatus]);

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
      showMissingPropertyOverlay &&
      !isOffline &&
      propertyStatus === PropertyStatus.MISSING &&
      propertyIndicator;

    if (!isOffline && !isConnecting && phase === null && !showMissingBadge) {
      return null;
    }

    const wrapperStyle: React.CSSProperties = {
      left: x,
      top: y,
      width,
      height,
      pointerEvents: 'none',
    };

    // Choose color class without nested ternary
    let indicatorColorClass: string | undefined;
    if (phase === 0) {
      indicatorColorClass = 'bg-yellow-400';
    } else if (phase === 1) {
      indicatorColorClass = 'bg-amber-500';
    } else if (phase === 2) {
      indicatorColorClass = 'bg-emerald-500';
    }

    return (
      <TooltipProvider>
        <div className="absolute" style={wrapperStyle}>
          {/* OFFLINE — red glass with XIcon */}
          {isOffline && (
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
                  <p className="font-semibold text-sm">{deviceId}</p>
                  <p className="text-xs opacity-90 mt-1">
                    Device is offline — no live data
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* CONNECTING ANIMATION — 3-phase pulse */}
          {phase !== null && phase < 3 && indicatorColorClass && (
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
                  <p className="font-medium text-xs">{deviceId}</p>
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
          {showMissingBadge && propertyIndicator && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-3 py-1.5 bg-amber-50/95 border border-amber-600 rounded shadow-md cursor-help backdrop-blur-sm">
                    <span className="text-amber-900 font-mono font-bold text-xs tracking-wider">
                      {typeof propertyIndicator.indicator === 'string'
                        ? propertyIndicator.indicator
                        : '??'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-gray-900 text-white border-gray-800 max-w-xs"
                >
                  <p className="text-xs leading-relaxed">
                    Property{' '}
                    <code className="font-mono bg-amber-900/30 px-1 rounded">
                      {propertyPath}
                    </code>{' '}
                    not found in device configuration.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }
);

PropertyOverlay.displayName = 'PropertyOverlay';
