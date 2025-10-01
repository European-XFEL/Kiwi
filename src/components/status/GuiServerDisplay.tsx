import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGlobalStore } from "@/store/globalAppStateStore";

export type GuiServerDisplayProps = {
  className?: string;
};

export default function GuiServerDisplay({ className }: GuiServerDisplayProps) {
  const { sessionInfo } = useGlobalStore();

  if (!sessionInfo) return null;

  const { guiServerHost, guiServerPort, guiServerVersion } = sessionInfo;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          <span className="text-sm text-muted-foreground">
            GUI Server:{" "}
            <span className="font-semibold text-foreground">
              {guiServerHost}:{guiServerPort}
            </span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Version: {guiServerVersion}</p>
      </TooltipContent>
    </Tooltip>
  );
}
