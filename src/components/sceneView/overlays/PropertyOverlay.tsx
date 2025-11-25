import React from "react";
import { usePropertyLevelIndicator } from "../../shared/hooks/usePropertyLevelIndicator";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropertyMonitorOverlayProps {
  keys: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

const PropertyMonitorOverlay: React.FC<PropertyMonitorOverlayProps> = ({
  keys,
  x,
  y,
  width,
  height,
}) => {
  const joinedKeys = useKaraboKeysString(keys);
  const propertyIndicator = usePropertyLevelIndicator(joinedKeys);

  if (!propertyIndicator) return null;

  const { indicator, label } = propertyIndicator;

  return (
    <TooltipProvider>
      <div
        className="absolute pointer-events-none"
        style={{
          left: x,
          top: y,
          width,
          height,
          zIndex: 30,
        }}
      >
        {/* Centered badge */}
        <div className="flex items-center justify-center w-full h-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="
                  pointer-events-auto
                  inline-flex items-center justify-center
                  h-7 min-w-7 px-2
                  rounded-full border border-amber-500/70
                  bg-amber-50 text-amber-900
                  text-xs font-semibold tracking-wide
                  shadow-sm
                  cursor-help
                "
                role="status"
                aria-label={label}
              >
                <span className="font-mono text-sm mr-0.5">{indicator}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-sans max-w-xs">
              <p className="text-xs text-amber-900">{label}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PropertyMonitorOverlay;
