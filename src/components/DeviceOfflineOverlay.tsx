import React from "react";
import { XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DynamicElementProps } from "../karabo_data/SceneElements";

const DeviceOfflineOverlay: React.FC<DynamicElementProps> = (props) => {
  const deviceId = props.karaboKeys.slice(0, props.karaboKeys.indexOf("."));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute inset-0 bg-red-500/5 flex items-center justify-center">
          <XCircle className="text-[#dd0000] font-bold" size={18} />
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
