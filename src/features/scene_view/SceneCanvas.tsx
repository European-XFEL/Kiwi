import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { Spinner } from '@/components/spinner';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { LoadProjectSceneResult } from '@/lib/ProjectDbInfo';
import { Scene } from '@/scene/Scene';
import { getDbConn, getTopology } from '@/singletons/api';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';
import useRecentStore from '@/store/recentScenesStore';
import { UserRecentSceneModel } from '@/view_models/RecentScenesModel';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSceneScale } from './hooks/useSceneScale';

const SVG_SHAPES = new Set(['ArrowPolygon', 'Line', 'Polygon', 'Rectangle']);

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scene, setScene] = React.useState<Scene | null>(null);
  const [error, setError] = React.useState<string>('');

  const { lastGlobalError, sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene, fitMode } = useLoadedSceneStore();
  const loggedUser = sessionInfo?.loggedUser;

  //attach a ref to the container div(viewport), to measure its size for scaling the scene to fit
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scale = useSceneScale(
    containerRef,
    scene ? { width: scene.width, height: scene.height } : null,
    fitMode
  );

  // Load + parse scene
  React.useEffect(() => {
    /** Sets a parsed scene after being sure that the system topology has
     * been initialized.
     *
     * If a scene is available in the cache upon a full application reload, it
     * is highly likely that the initial system topology will be still unknown,
     * as it has to be received from the connected GUI Server via the network.
     */
    function setSceneDeferrable(parsed: Scene) {
      if (getTopology().initialized) {
        setScene(parsed);
        setError('');
      } else {
        const checkTopology = setInterval(() => {
          if (getTopology().initialized) {
            setScene(parsed);
            setError('');
            clearInterval(checkTopology);
          }
        }, 100);
      }
    }

    const sceneParams = sceneParamsFromURL(location.search);
    if (sceneParams) {
      getDbConn().getScene(
        sceneParams?.domain,
        sceneParams?.projectName,
        sceneParams?.uuid,
        (result: LoadProjectSceneResult) => {
          // console.log('[SceneCanvas] getScene result:', result);
          if (result.error_msg) {
            setError(
              `Couldn't retrieve scene data.<br/>Please check Project Database availability.<br/>Details: ${result.error_msg}`
            );
            setScene(null);
            document.title = 'Kiwi';
            return;
          }
          try {
            const parsed = new Scene(result.scene!.svg);
            setLoadedScene({ width: parsed.width, height: parsed.height });
            if (loggedUser) {
              const recentScene: UserRecentSceneModel = {
                userId: loggedUser,
                domain: result.scene!.domain,
                uuid: result.scene!.uuid,
                name: result.scene!.name,
                projectName: result.scene!.projectName,
              };
              setRecentScene(recentScene);
            }
            document.title = `Kiwi [${result.scene!.domain}:${result.scene!.name}]`;
            setSceneDeferrable(parsed);
          } catch (e) {
            setError(`Couldn't parse scene data.<br/>${String(e)}`);
            setScene(null);
          }
        } // getScene.onScene
      ); // getDbConn.getScene
    } // if (sceneParams)
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
            <Button onClick={() => navigate('/no_scene')}>Back to Start</Button>
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

    if (lastGlobalError) {
      return (
        <div className="flex flex-col gap-4 max-w-2xl">
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unrecoverable Error</AlertTitle>
            <AlertDescription
              dangerouslySetInnerHTML={{ __html: lastGlobalError }}
            />
          </Alert>
        </div>
      );
    }

    const width = scene.width;
    const height = scene.height;

    //Use the FLAT list, already layout-resolved by Scene
    const flat = scene.sceneElements;

    // Split into SVG primitives vs HTML widgets
    const shapes = flat.filter((el) => {
      const name = el.reactComponent?.name || '';
      return SVG_SHAPES.has(name);
    });

    const widgets = flat.filter((el) => {
      const name = el.reactComponent?.name || '';
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
              transformOrigin: 'top left',
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
