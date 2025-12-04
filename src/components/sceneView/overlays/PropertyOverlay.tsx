import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { ProxyStatus, PropertyStatus } from "@/device/enums";

const CONNECTING_STATUSES: ProxyStatus[] = [
  ProxyStatus.SCHEMA_REQUESTED,
  ProxyStatus.SCHEMA_RECEIVED,
];

const PHASE_DURATION_MS = 800;

export interface PropertyOverlayProps {
  karaboKeys: string | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  showMissingPropertyOverlay?: boolean;
}

export const PropertyOverlay: React.FC<PropertyOverlayProps> = ({
  karaboKeys,
  x,
  y,
  width,
  height,
  showMissingPropertyOverlay = false,
}) => {
  const {
    deviceId,
    propertyPath,
    proxyStatus,
    propertyStatus,
    propertyIndicator,
    isOffline,
    isReady,
  } = useDeviceProperty(karaboKeys);

  if (!deviceId || !karaboKeys) return null;

  const isConnectingStatus = CONNECTING_STATUSES.includes(proxyStatus);
  const isHealthy = proxyStatus === ProxyStatus.MONITORING && isReady;

  // Animation state
  const [phase, setPhase] = React.useState<number | null>(null);
  const hasEverConnected = React.useRef(false);

  // Start animation only once — first time we reach "healthy"
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

  // Advance animation phases
  React.useEffect(() => {
    if (phase === null) return;

    if (phase >= 3) {
      // Final fade-out
      const timer = setTimeout(() => setPhase(null), 400);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(
      () => setPhase((p) => (p === null ? null : p + 1)),
      PHASE_DURATION_MS
    );
    return () => clearTimeout(timer);
  }, [phase]);

  // Property missing badge
  const showMissingBadge =
    showMissingPropertyOverlay &&
    !isOffline &&
    isReady &&
    propertyStatus === PropertyStatus.MISSING &&
    propertyIndicator;

  // Nothing at all to render
  if (
    !isOffline &&
    !isConnectingStatus &&
    phase === null &&
    !showMissingBadge
  ) {
    return null;
  }

  const wrapperStyle: React.CSSProperties = {
    left: x,
    top: y,
    width,
    height,
    pointerEvents: "none",
  };

  const breath =
    phase !== null
      ? {
          x: Math.sin(phase * 4) * 0.3,
          y: Math.cos(phase * 3.7) * 0.2,
        }
      : { x: 0, y: 0 };

  const getPhaseColor = (p: number) => {
    if (p === 0) return "bg-yellow-400 ring-yellow-300";
    if (p === 1) return "bg-amber-400 ring-amber-300";
    return "bg-emerald-500 ring-emerald-400";
  };

  return (
    <TooltipProvider>
      <div className="absolute" style={wrapperStyle}>
        {/* 1. OFFLINE — red glass panel */}
        {isOffline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute inset-0 rounded bg-red-100/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-help border border-red-300">
                <span className="text-red-700 font-bold text-xs tracking-wider">
                  OFFLINE
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium">{deviceId}</p>
              <p className="text-xs text-muted-foreground">Device is offline</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 2. CONNECTING + first MONITORING → pulsing dot (auto-disappears) */}
        {phase !== null && phase < 3 && (
          <div className="absolute top-1.5 right-1.5 pointer-events-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`
                    h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-opacity-30
                    ${getPhaseColor(phase)}
                  `}
                  style={{
                    transform: `translate(${breath.x}px, ${breath.y}px) scale(${
                      1 + phase * 0.04
                    })`,
                    animation:
                      "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="font-medium">{deviceId}</p>
                <p>
                  {phase === 0 && "Connecting..."}
                  {phase === 1 && "Loading config..."}
                  {phase === 2 && "Ready!"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* 3. PROPERTY MISSING — amber "??" badge */}
        {showMissingBadge && propertyIndicator && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-600 rounded shadow-sm cursor-help">
                  <span className="text-amber-900 font-mono font-bold text-xs">
                    {typeof propertyIndicator.indicator === "string"
                      ? propertyIndicator.indicator
                      : "??"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Property{" "}
                  <code className="font-mono px-1 bg-amber-100 rounded">
                    {propertyPath}
                  </code>{" "}
                  not found in device
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
