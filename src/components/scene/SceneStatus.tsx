import { XCircle, Dot, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGlobalStore } from "@/store/globalAppStateStore";
import { useNavigate, useLocation } from "react-router-dom";
import { ProjectSceneCache } from "@/store/ProjectSceneCache";
import { ProjectSceneInfo } from "@/karabo_data/ProjectDbInfo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/shared/helpers/cn";

export type SceneStatusProps = {
  className?: string;
  variant?: "full" | "compact";
};

export default function SceneStatus({
  className,
  variant = "full",
}: SceneStatusProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoadedScene } = useGlobalStore();
  const [sceneInfo, setSceneInfo] = useState<{
    domain: string;
    projectName: string;
    name: string;
  } | null>(null);

  const hasScene = useMemo(() => sceneInfo !== null, [sceneInfo]);

  const handleUnloadScene = useCallback(() => {
    if (!hasScene) return;
    setLoadedScene(undefined);
    setSceneInfo(null);
    navigate("/no_scene");
  }, [hasScene, navigate, setLoadedScene]);

  useEffect(() => {
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (info) {
          setSceneInfo({
            domain: info.domain,
            projectName: info.projectName,
            name: info.name,
          });
        } else {
          setSceneInfo(null);
        }
      }
    );
  }, [location.search]);

  const fullSceneName = sceneInfo
    ? `${sceneInfo.domain} :: ${sceneInfo.projectName} :: ${sceneInfo.name}`
    : "";

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          {hasScene && sceneInfo && (
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
                <TooltipContent className="max-w-sm break-words">
                  <p>Unload: {fullSceneName}</p>
                </TooltipContent>
              </Tooltip>

              <div className="text-xs">
                <span className="font-semibold">{sceneInfo.projectName}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{sceneInfo.name}</span>
              </div>

              <Badge
                variant="secondary"
                className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                Active
              </Badge>
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

  // Full variant
  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUnloadScene}
              disabled={!hasScene}
              aria-label={hasScene ? "Unload scene" : "No scene to unload"}
              className={cn(
                "hover:text-destructive hover:bg-destructive/10",
                !hasScene && "opacity-50 cursor-not-allowed"
              )}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm break-words">
            <p>{hasScene ? `Unload: ${fullSceneName}` : "No scene loaded"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Scene info */}
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-muted/50">
          {hasScene && sceneInfo ? (
            <>
              <FileText
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="text-sm">
                <span className="font-semibold">{sceneInfo.projectName}</span>
                <span className="text-muted-foreground mx-1.5">·</span>
                <span>{sceneInfo.name}</span>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
              >
                Active
              </Badge>
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
