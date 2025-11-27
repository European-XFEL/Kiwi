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

  const wrapperStyle: React.CSSProperties = {
    left: x,
    top: y,
    width,
    height,
    zIndex: 30,
  };

  return (
    <TooltipProvider>
      <div className="absolute pointer-events-none" style={wrapperStyle}>
        {/* Subtle technical-looking frame */}
        <div className="absolute inset-0 rounded border border-amber-400/80 bg-amber-50/20" />

        {/* Centered diagnostic badge */}
        <div className="relative flex h-full w-full items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="
                  pointer-events-auto
                  inline-flex items-center justify-center
                  h-6 min-w-8 px-2
                  rounded-sm
                  bg-amber-50
                  border border-amber-500
                  text-[11px] font-mono font-semibold
                  text-amber-900
                  cursor-help
                "
                role="status"
                aria-label={label}
              >
                {indicator}
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
