import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Button } from '@/components/button';
import { Card, CardContent } from '@/components/card';
import { Spinner } from '@/components/spinner';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { ElementRenderer } from '@/features/scene-view/render/ElementRenderer';
import type { SceneModel } from '@/karabo/common/models/SceneModel';
import { LoadProjectSceneResult } from '@/lib/ProjectDbInfo';
import { getDbConn, getTopology } from '@/singletons/api';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';
import useRecentStore from '@/store/recentScenesStore';
import { UserRecentSceneModel } from '@/view_models/RecentScenesModel';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSceneScale } from '../scene_view/hooks/useSceneScale';

// Bootstrap — triggers all registerRenderer() calls
import '@/features/scene-view/renderers';

const SceneCanvas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [scene, setScene] = React.useState<SceneModel | null>(null);
  const [error, setError] = React.useState<string>('');

  const { lastGlobalError, sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene, fitMode } = useLoadedSceneStore();
  const loggedUser = sessionInfo?.loggedUser;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scale = useSceneScale(
    containerRef,
    scene ? { width: scene.width, height: scene.height } : null,
    fitMode
  );

  // Load + parse scene
  React.useEffect(() => {
    function setSceneDeferrable(model: SceneModel) {
      if (getTopology().initialized) {
        setScene(model);
        setError('');
      } else {
        const poll = setInterval(() => {
          if (getTopology().initialized) {
            clearInterval(poll);
            setScene(model);
            setError('');
          }
        }, 100);
      }
    }

    const sceneParams = sceneParamsFromURL(location.search);
    if (sceneParams) {
      getDbConn().getScene(
        sceneParams.domain,
        sceneParams.projectName,
        sceneParams.uuid,
        (result: LoadProjectSceneResult) => {
          if (result.error_msg) {
            setError(
              `Couldn't retrieve scene data.<br/>Please check Project Database availability.<br/>Details: ${result.error_msg}`
            );
            setScene(null);
            document.title = 'Kiwi';
            return;
          }

          const model = result.model!;
          setLoadedScene({ width: model.width, height: model.height });

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
          setSceneDeferrable(model);
        }
      );
    }
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
        <div className="w-full min-h-full flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <Spinner className="text-primary" variant="default" size={32} />
              <div className="flex-1">Loading scene...</div>
            </CardContent>
          </Card>
        </div>
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

    const { width, height } = scene;

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
            {scene.children.map((child, i) => (
              <ElementRenderer key={i} model={child} />
            ))}
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
