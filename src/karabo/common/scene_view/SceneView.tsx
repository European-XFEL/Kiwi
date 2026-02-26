/**
 * SceneView — new render pipeline.
 *
 * Load flow mirrors SceneCanvas:
 *   URL params → getDbConn().getScene → readScene → SceneModel → ElementRenderer
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import { sceneParamsFromURL } from '@/features/navigation/utils';
import { getDbConn, getTopology } from '@/singletons/api';
import type { LoadProjectSceneResult } from '@/lib/ProjectDbInfo';
import type { SceneModel } from '@/karabo/common/models/SceneModel';
import { ElementRenderer } from '@/karabo/common/scene_view/render/ElementRenderer';

// Bootstrap — triggers all registerRenderer() calls
import './renderers';

// SceneView
// ----------------------------------------------------------------------------

const SceneView: React.FC = () => {
  const location = useLocation();

  const [sceneModel, setSceneModel] = React.useState<SceneModel | null>(null);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    const sceneParams = sceneParamsFromURL(location.search);
    if (!sceneParams) return;

    getDbConn().getScene(
      sceneParams.domain,
      sceneParams.projectName,
      sceneParams.uuid,
      (result: LoadProjectSceneResult) => {
        if (result.error_msg) {
          setError(result.error_msg);
          setSceneModel(null);
          return;
        }

        const model = result.model!;

        // Defer rendering until topology is ready (device subscriptions need it)
        if (getTopology().initialized) {
          setSceneModel(model);
        } else {
          const poll = setInterval(() => {
            if (getTopology().initialized) {
              clearInterval(poll);
              setSceneModel(model);
            }
          }, 100);
        }
      }
    );
  }, [location.search]);

  if (error) {
    return (
      <div className="p-4 text-red-600 border border-red-300 rounded bg-red-50">
        {error}
      </div>
    );
  }

  if (!sceneModel) {
    return <div className="p-4 text-gray-500">Loading scene...</div>;
  }

  return (
    <div className="flex items-center justify-center w-full h-full overflow-auto">
      {/* Scene canvas — the absolute positioning coordinate space */}
      <div
        className="relative bg-[#eeeeee] shadow-lg"
        style={{ width: sceneModel.width, height: sceneModel.height }}
      >
        {sceneModel.children.map((child, i) => (
          <ElementRenderer key={i} model={child} />
        ))}
      </div>
    </div>
  );
};

export default SceneView;
