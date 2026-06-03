import { Button } from '@/components/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/api';
import { cn } from '@/components/api';
import { useLoadedSceneStore } from '@/store/api';
import type { FitMode } from '../hooks/useSceneScale';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Scan,
} from 'lucide-react';

const MODES: { mode: FitMode; icon: React.ReactNode; label: string }[] = [
  {
    mode: 'fit-page',
    icon: <Minimize2 className="h-4 w-4" />,
    label: 'Fit to Page',
  },
  {
    mode: 'fit-screen',
    icon: <Maximize2 className="h-4 w-4" />,
    label: 'Fit to Screen',
  },
  {
    mode: 'fit-width',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    label: 'Fit to Width',
  },
  {
    mode: 'fit-height',
    icon: <ArrowUpDown className="h-4 w-4" />,
    label: 'Fit to Height',
  },
  { mode: 'actual', icon: <Scan className="h-4 w-4" />, label: 'Actual Size' },
];

export function FitModeToolbar() {
  const { fitMode, setFitMode } = useLoadedSceneStore();

  return (
    <TooltipProvider delayDuration={400}>
      <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-0.5 rounded-lg border bg-background/80 backdrop-blur-sm p-1 shadow-md">
        {MODES.map(({ mode, icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 sm:h-7 sm:w-7',
                  fitMode === mode &&
                    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
                onClick={() => setFitMode(mode)}
                aria-label={label}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
