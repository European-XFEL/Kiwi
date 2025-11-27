import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { DeviceIndicatorDescriptor } from "@/device_proxy/types";
import { ProxyStatus } from "@/device_proxy/enum";
import { DEVICE_INDICATORS } from "@/device_proxy/overlay_indicator_constants";

import { useDeviceLevelIndicator } from "@/components/shared/hooks/useDeviceLevelIndicator";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";

export interface DeviceMonitoringOverlayProps {
  keys: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

// Visual phases we want to show once the device becomes "online-ish"
const PHASE_STATUSES = [
  ProxyStatus.SCHEMA_REQUESTED,
  ProxyStatus.SCHEMA_RECEIVED,
  ProxyStatus.MONITORING,
] as const;

// Map those statuses to the shared DEVICE_INDICATORS config
const PHASE_DESCRIPTORS: DeviceIndicatorDescriptor[] = PHASE_STATUSES.map(
  (status) => DEVICE_INDICATORS.find((d) => d.status === status)
).filter((d): d is DeviceIndicatorDescriptor => !!d);

const STEP_MS = 800; // long enough that you can really see each step

type PhaseOffset = { dx: number; dy: number };

function makePhaseOffsets(): PhaseOffset[] {
  // Tiny jitter so it feels alive but not noisy
  return PHASE_DESCRIPTORS.map(() => ({
    dx: (Math.random() - 0.5) * 3, // -1.5 … +1.5 px
    dy: (Math.random() - 0.5) * 2, // -1 … +1 px
  }));
}

function useDeviceMonitoringPhase(karaboKeys: string) {
  const descriptor = useDeviceLevelIndicator(karaboKeys);

  const [phaseIndex, setPhaseIndex] = React.useState<number | null>(null);
  const hasAnimatedRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const isOnlineLike =
      descriptor !== null && descriptor.status !== ProxyStatus.OFFLINE;

    // If device is offline or unknown → reset animation
    if (!isOnlineLike) {
      hasAnimatedRef.current = false;
      setPhaseIndex(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // First time we see "online-ish" → start at phase 0 (yellow)
    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      setPhaseIndex(0);
      return;
    }

    // Already finished → keep hidden as long as device stays online
    if (phaseIndex === null) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setPhaseIndex((prev) => {
        if (prev === null) return prev;
        if (prev >= PHASE_DESCRIPTORS.length - 1) {
          // last phase (green) → hide
          return null;
        }
        return prev + 1;
      });
    }, STEP_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [descriptor, phaseIndex]);

  return { descriptor, phaseIndex };
}

const DeviceMonitoringOverlay: React.FC<DeviceMonitoringOverlayProps> = ({
  keys,
  x,
  y,
  width,
  height,
}) => {
  const keysStr = useKaraboKeysString(keys);
  const { deviceId } = React.useMemo(() => splitKaraboKeys(keysStr), [keysStr]);

  const { descriptor, phaseIndex } = useDeviceMonitoringPhase(keysStr);

  const [phaseOffsets] = React.useState<PhaseOffset[]>(() =>
    makePhaseOffsets()
  );

  if (!descriptor) return null;

  const wrapperStyle: React.CSSProperties = {
    left: x,
    top: y,
    width,
    height,
  };

  // OFFLINE → red glass overlay using descriptor
  if (descriptor.status === ProxyStatus.OFFLINE) {
    const OfflineIcon = descriptor.icon;
    const offlineLabel = descriptor.label ?? "Device offline";

    return (
      <TooltipProvider>
        <div className="absolute pointer-events-none" style={wrapperStyle}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute inset-0 bg-red-100/90 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-help border border-red-300/60 rounded transition-all duration-300 hover:bg-red-100/95"
                role="status"
                aria-label={`${deviceId} is offline`}
              >
                {OfflineIcon ? (
                  <OfflineIcon className="text-red-600" size={16} />
                ) : (
                  <span className="text-red-600 text-xs font-semibold">
                    OFF
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-sans">
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-sm">{deviceId}</p>
                <p className="text-xs text-muted-foreground">{offlineLabel}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Online-ish but animation finished → no overlay
  if (phaseIndex === null) return null;

  const phaseDescriptor = PHASE_DESCRIPTORS[phaseIndex];
  const offset = phaseOffsets[phaseIndex] ?? { dx: 0, dy: 0 };

  const colorClass = phaseDescriptor.color ?? "bg-green-500";
  const label = phaseDescriptor.label;

  return (
    <TooltipProvider>
      <div className="absolute pointer-events-none" style={wrapperStyle}>
        <div className="absolute top-1.5 right-1.5 pointer-events-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`
                  flex h-2.5 w-2.5 rounded-full
                  ${colorClass}
                  border border-white/80
                  shadow-sm transition-opacity duration-200 ease-out
                  opacity-100
                `}
                style={{
                  transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.1)`,
                }}
                aria-label={`${deviceId}: ${label}`}
                role="status"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-sans">
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-sm">{deviceId}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DeviceMonitoringOverlay;
