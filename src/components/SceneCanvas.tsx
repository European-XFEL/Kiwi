import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectSceneCache } from "../store/ProjectSceneCache";
import { ProjectSceneInfo } from "../karabo_data/ProjectDbInfo";
import { UserRecentSceneModel } from "../view_models/RecentScenesModel";
import { Scene } from "../scene/Scene";
import { useGlobalStore } from "../store/globalAppStateStore";
import useRecentStore from "../store/recentScenesStore";
import { useLoadedSceneStore } from "../store/loadedSceneStore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";

const SVG_SHAPES = new Set(["ArrowPolygon", "Line", "Polygon", "Rectangle"]);

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scene, setScene] = React.useState<Scene | null>(null);
  const [error, setError] = React.useState<string>("");

  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene } = useLoadedSceneStore();
  const loggedUser = sessionInfo?.loggedUser;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  // Auto-fit scaling
  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !scene) return;
      const { width: cw, height: ch } =
        containerRef.current.getBoundingClientRect();

      const sw = scene.width;
      const sh = scene.height;

      if (sw > 0 && sh > 0 && cw > 0 && ch > 0) {
        const availW = Math.max(cw - 8, 0);
        const availH = Math.max(ch - 8, 0);
        const s = Math.min(availW / sw, availH / sh, 1);
        setScale(Number.isFinite(s) ? s : 1);
      } else {
        setScale(1);
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [scene]);

  // Load + parse scene
  React.useEffect(() => {
    ProjectSceneCache.inst.getSceneInfoFromQueryParams(
      location.search,
      (info: ProjectSceneInfo | null) => {
        if (!info) {
          setError(
            "Couldn't retrieve scene data.<br/>Please check Project Database availability."
          );
          setScene(null);
          document.title = "Kiwi";
          return;
        }

        try {
          const parsed = new Scene(info.svg);

          // tell the app the size
          setLoadedScene({ width: parsed.width, height: parsed.height });

          if (loggedUser) {
            const recentScene: UserRecentSceneModel = {
              userId: loggedUser,
              domain: info.domain,
              uuid: info.uuid,
              name: info.name,
              projectName: info.projectName,
            };
            setRecentScene(recentScene);
          }

          document.title = `Kiwi [${info.domain}:${info.name}]`;
          setScene(parsed);
          setError("");
        } catch (e) {
          setError(`Couldn't parse scene data.<br/>${String(e)}`);
          setScene(null);
        }
      }
    );
  }, [location.search, loggedUser, setLoadedScene, setRecentScene]);

  const renderScene = () => {
    if (!scene) {
      if (error) {
        return (
          <div className="flex flex-col gap-4 max-w-2xl">
            <Alert variant="destructive" className="border-destructive/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn't load scene</AlertTitle>
              <AlertDescription dangerouslySetInnerHTML={{ __html: error }} />
            </Alert>
            <Button onClick={() => navigate("/no_scene")}>Back to Start</Button>
          </div>
        );
      }

      return (
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <Spinner className="text-primary" variant="default" size={32} />
            <div className="flex-1">Loading scene...</div>
          </CardContent>
        </Card>
      );
    }

    const width = scene.width;
    const height = scene.height;

    //Use the FLAT list, already layout-resolved by Scene
    const flat = scene.sceneElements;

    // Split into SVG primitives vs HTML widgets
    const shapes = flat.filter((el) => {
      const name = el.reactComponent?.name || "";
      return SVG_SHAPES.has(name);
    });

    const widgets = flat.filter((el) => {
      const name = el.reactComponent?.name || "";
      return !SVG_SHAPES.has(name);
    });

    const renderIfComponent = (
      component: React.FC<any> | undefined,
      props: any,
      key: string
    ) => (component ? React.createElement(component, { key, ...props }) : null);

    return (
      <div className="w-full h-full overflow-auto">
        <div
          className="mx-auto"
          style={{
            width: Math.ceil(width * scale),
            height: Math.ceil(height * scale),
          }}
        >
          <div
            className="relative bg-[#eeeeee] shadow-lg rounded-md overflow-clip"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {/* SVG layer */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={width}
              height={height}
              xmlns="http://www.w3.org/2000/svg"
            >
              {shapes.map((el, idx) =>
                renderIfComponent(el.reactComponent, el.props, `shape_${idx}`)
              )}
            </svg>

            {/* HTML layer */}
            <div className="relative">
              {widgets.map((el, idx) =>
                renderIfComponent(el.reactComponent, el.props, `widget_${idx}`)
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full p-2 sm:p-4 box-border">
      {renderScene()}
    </div>
  );
};

export default SceneCanvas;
