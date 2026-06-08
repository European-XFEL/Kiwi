import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@/components/api';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { useActiveSceneStore } from '@/features/scene-view/api';
import { Dot, FileText, XCircle } from 'lucide-react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SceneStatusProps = {
  className?: string;
  variant?: 'full' | 'compact';
};

export default function SceneStatus({
  className,
  variant = 'full',
}: SceneStatusProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sceneParams = sceneParamsFromURL(location.search);
  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const setLoadedSceneRef = useActiveSceneStore(
    (state) => state.setLoadedSceneRef
  );
  const activeLoadedSceneRef =
    sceneParams && loadedSceneRef?.uuid === sceneParams.uuid
      ? loadedSceneRef
      : null;
  const hasScene = activeLoadedSceneRef !== null;

  const handleUnloadScene = useCallback(() => {
    if (!hasScene) return;
    setLoadedSceneRef(undefined);
    navigate('/home');
  }, [hasScene, navigate, setLoadedSceneRef]);

  const fullSceneName = activeLoadedSceneRef
    ? `${activeLoadedSceneRef.domain} :: ${activeLoadedSceneRef.projectName} :: ${activeLoadedSceneRef.name}`
    : '';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          {hasScene && activeLoadedSceneRef && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleUnloadScene}
                    aria-label="Unload scene"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm wrap-break-word">
                  <p>Unload: {fullSceneName}</p>
                </TooltipContent>
              </Tooltip>

              <div className="text-xs">
                <span className="font-semibold">
                  {activeLoadedSceneRef.projectName}
                </span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{activeLoadedSceneRef.name}</span>
              </div>
            </>
          )}

          {!hasScene && (
            <Badge variant="outline" className="gap-1.5">
              <Dot className="h-4 w-4 -ml-1" aria-hidden="true" />
              No Scene
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-3', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUnloadScene}
              disabled={!hasScene}
              aria-label={hasScene ? 'Unload scene' : 'No scene to unload'}
              className={cn(
                'hover:text-destructive hover:bg-destructive/10',
                !hasScene && 'opacity-50 cursor-not-allowed'
              )}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm wrap-break-word">
            <p>{hasScene ? `Unload: ${fullSceneName}` : 'No scene loaded'}</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-muted/50">
          {hasScene && activeLoadedSceneRef ? (
            <>
              <FileText
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="text-sm">
                <span className="font-semibold">
                  {activeLoadedSceneRef.projectName}
                </span>
                <span className="text-muted-foreground mx-1.5">·</span>
                <span>{activeLoadedSceneRef.name}</span>
              </div>
            </>
          ) : (
            <>
              <Dot
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">
                No scene loaded
              </span>
              <Dot
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
