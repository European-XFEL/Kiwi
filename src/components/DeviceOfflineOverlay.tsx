import React from "react";
import { XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Minimal props for the overlay using the prototype new model typing vocabulary.
 * No DynamicElementProps. No "key" in the prop type (React reserves that).
 */
export interface DeviceOfflineOverlayProps {
  keys: string[]; // scene model uses string[]
  x: number;
  y: number;
  width: number;
  height: number;
}

const DeviceOfflineOverlay: React.FC<DeviceOfflineOverlayProps> = (props) => {
  const { keys, x, y, width, height } = props;

  // Normalize the first key and derive device id (supports both "DEVICE.prop" and "DEVICE/.../prop")
  const firstKey = keys?.[0] ?? "";
  const deviceId = firstKey.includes(".")
    ? firstKey.slice(0, firstKey.indexOf("."))
    : firstKey.split("/")[0] ?? firstKey;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute bg-red-500/5 flex items-center justify-center"
          style={{ left: x, top: y, width, height }}
        >
          <XCircle className="text-[#dd0000]" size={18} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <span className="font-bold">{deviceId}</span> is offline
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default DeviceOfflineOverlay;
