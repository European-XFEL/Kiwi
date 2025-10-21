import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectSceneCache } from "../store/ProjectSceneCache";
import { ProjectSceneInfo } from "../karabo_data/ProjectDbInfo";
import { UserRecentSceneModel } from "../view_models/RecentScenesModel";
import {
  SceneElement,
  SceneElementProps,
  WidgetElement,
} from "../karabo_data/SceneElements";
import { Scene } from "../karabo_data/Scene";
import { useGlobalStore } from "../store/globalAppStateStore";
import useRecentStore from "../store/recentScenesStore";
import { useLoadedSceneStore } from "../store/loadedSceneStore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scene, setScene] = React.useState<Scene | null>(null);
  const [loadingError, setLoadingError] = React.useState<string>("");

  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene } = useLoadedSceneStore();
  const loggedUser = sessionInfo?.loggedUser;

  // measure container to compute scale
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  // Recompute scale whenever container or scene size changes
  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !scene) return;
      const { width: cw, height: ch } =
        containerRef.current.getBoundingClientRect();
      if (scene.width > 0 && scene.height > 0 && cw > 0 && ch > 0) {
        // leave a small padding margin (8px)
        const availW = Math.max(cw - 8, 0);
        const availH = Math.max(ch - 8, 0);
        const s = Math.min(availW / scene.width, availH / scene.height, 1);
        setScale(Number.isFinite(s) ? s : 1);
      } else {
        setScale(1);
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [scene]);

  const renderScene = () => {
    if (scene) {
      return (
        <div className="w-full h-full overflow-auto">
          {/* Fit-to-container wrapper */}
          <div
            className="mx-auto"
            style={{
              width: Math.ceil(scene.width * scale),
              height: Math.ceil(scene.height * scale),
            }}
          >
            {/* Container for both layers */}
            <div
              className="relative bg-[#eeeeee] shadow-lg rounded-md overflow-clip"
              style={{
                width: scene.width,
                height: scene.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Layer 1: SVG layer for shapes (arrows, lines, polygons) */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: scene.width,
                  height: scene.height,
                }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {scene.sceneElements.map((el: SceneElement, idx: number) => {
                  if (el instanceof WidgetElement) {
                    const widget = el as WidgetElement<SceneElementProps>;
                    // Check if this is an SVG shape (ArrowPolygon, Line, etc.)
                    const componentName = widget.reactComponent?.name || "";
                    const isSvgShape = [
                      "ArrowPolygon",
                      "Line",
                      "Polygon",
                    ].includes(componentName);

                    if (isSvgShape && widget.reactComponent) {
                      const { key, ...restProps } = widget.props as any;
                      return React.createElement(widget.reactComponent, {
                        key: `svg_${idx}`,
                        ...restProps,
                      });
                    }
                  }
                  return null;
                })}
              </svg>

              {/*Layer 2: HTML layer for widgets (labels, buttons, etc.) */}
              {scene.sceneElements.map((el: SceneElement, idx: number) => {
                if (el instanceof WidgetElement) {
                  const widget = el as WidgetElement<SceneElementProps>;
                  const componentName = widget.reactComponent?.name || "";
                  const isSvgShape = [
                    "ArrowPolygon",
                    "Line",
                    "Polygon",
                  ].includes(componentName);

                  // Render HTML widgets (not SVG shapes)
                  if (!isSvgShape && widget.reactComponent) {
                    const { key, ...restProps } = widget.props as any;
                    return React.createElement(widget.reactComponent, {
                      key: `html_${idx}`,
                      ...restProps,
                    });
                  }
                }
                return null;
              })}
            </div>
          </div>
        </div>
      );
    } else if (loadingError.length > 0) {
      return (
        <div className="flex flex-col gap-4 max-w-2xl">
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn't load scene</AlertTitle>
            <AlertDescription
              dangerouslySetInnerHTML={{ __html: loadingError }}
            />
          </Alert>
          <Button onClick={() => navigate("/no_scene")}>
            Back to Starting Page
          </Button>
        </div>
      );
    } else {
      return (
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <Spinner className="text-primary" variant="default" size={32} />
            <div className="flex-1">Loading scene ...</div>
          </CardContent>
        </Card>
      );
    }
  };

  React.useEffect(() => {
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (info) {
          try {
            const parsed = new Scene(info.svg);

            setLoadedScene({
              width: parsed.width,
              height: parsed.height,
            });

            if (loggedUser) {
              const userRecentScenes: UserRecentSceneModel = {
                userId: loggedUser,
                domain: info.domain,
                uuid: info.uuid,
                name: info.name,
                projectName: info.projectName,
              };
              setRecentScene(userRecentScenes);
            }

            document.title = `Kiwi [${info.domain}:${info.name}]`;
            setScene(parsed);
            setLoadingError("");
          } catch (e) {
            setLoadingError(
              `Couldn't parse scene data. Details:<br />${String(e)}`
            );
            setScene(null);
          }
        } else {
          document.title = "Kiwi";
          setLoadingError(
            "Couldn't retrieve scene data.<br />Please check the availability of the Project Database"
          );
          setScene(null);
        }
      }
    );
  }, [location.search, loggedUser, setLoadedScene, setRecentScene]);

  return (
    <div ref={containerRef} className="w-full h-full p-2 sm:p-4 box-border">
      {renderScene()}
    </div>
  );
};

export default SceneCanvas;
