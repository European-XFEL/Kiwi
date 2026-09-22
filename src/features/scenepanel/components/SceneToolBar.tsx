import { Button, Separator } from '@/components/api';
import declineIcon from '@/assets/icons/general/no.png';
import applyIcon from '@/assets/icons/general/yes.png';
import icons from '@/assets/icons';
import { type FitMode, FitModeSelect } from '@/features/scene-view/api';
import { Maximize, Minimize } from 'lucide-react';

export interface SceneToolBarProps {
  width: number;
  height: number;
  scale: number;
  fitMode: FitMode;
  isUnattachedScene?: boolean;
  onFitModeChange: (mode: FitMode) => void;
  isFullscreen?: boolean;
  // When omitted (e.g. fullscreen unsupported), the toggle is not rendered.
  onToggleFullscreen?: () => void;
}

const toolbarButtonClassName =
  'h-7 w-7 cursor-pointer rounded-[2px] border border-transparent bg-transparent p-1 shadow-none ' +
  'hover:border-[#8f8f8f] hover:bg-[#e2e2e2] aria-disabled:opacity-100';

export function SceneToolBar({
  width,
  height,
  scale,
  fitMode,
  isUnattachedScene = false,
  onFitModeChange,
  isFullscreen = false,
  onToggleFullscreen,
}: SceneToolBarProps) {
  const safeScale = Number.isFinite(scale) ? scale : 1;
  const scalePercent = `${Math.round(safeScale * 100)}%`;
  const formattedWidth = width.toLocaleString('de-DE');
  const formattedHeight = height.toLocaleString('de-DE');

  return (
    <div
      data-testid="scene-toolbar"
      className="flex h-10 items-center justify-between gap-3 border-b border-[#8d8d8d] bg-[#d7d7d7] px-2"
    >
      <div className="flex items-center gap-1">
        {isUnattachedScene ? (
          <img
            src={icons.deviceClass}
            alt="Unattached scene"
            title="Unattached scene"
            data-testid="scene-device-class-icon"
            className="h-4 w-4"
          />
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-disabled="true"
          type="button"
          tabIndex={-1}
          data-testid="scene-apply-all"
          aria-label="Apply all changes"
          className={toolbarButtonClassName}
        >
          <img src={applyIcon} alt="" className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-disabled="true"
          type="button"
          tabIndex={-1}
          data-testid="scene-decline-all"
          aria-label="Decline all changes"
          className={toolbarButtonClassName}
        >
          <img
            src={declineIcon}
            alt=""
            className="h-4 w-4"
            aria-hidden="true"
          />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#111111]">
        <span className="text-[#3f3f3f]">Scene size:</span>
        <span className="font-semibold tabular-nums">
          {formattedWidth} x {formattedHeight} px
        </span>
        <Separator orientation="vertical" className="h-5 bg-[#9a9a9a]" />
        <span className="text-[#3f3f3f]">Scale:</span>
        <span className="font-semibold tabular-nums">{scalePercent}</span>
        <Separator orientation="vertical" className="h-5 bg-[#9a9a9a]" />
        <FitModeSelect
          fitMode={fitMode}
          onFitModeChange={onFitModeChange}
          isFullscreen={isFullscreen}
        />
        {onToggleFullscreen ? (
          <>
            <Separator orientation="vertical" className="h-5 bg-[#9a9a9a]" />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onToggleFullscreen}
              data-testid="scene-fullscreen-toggle"
              aria-pressed={isFullscreen}
              aria-label={
                isFullscreen ? 'Exit full screen' : 'View full screen'
              }
              title={isFullscreen ? 'Exit full screen' : 'View full screen'}
              className={toolbarButtonClassName}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default SceneToolBar;
