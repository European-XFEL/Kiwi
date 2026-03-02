import AppBody from '../AppBody';
import NoScenePanel from '../NoScenePanel';
//import { SceneCanvas } from '@/features/scene_view';
//import SceneView from '@/karabo-common/scene_view/SceneView';
import { SceneView } from '@/features/scene-view';
import { RouteProp } from '../router/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      {
        path: 'scene',
        element: <SceneView />,
      },
      {
        path: 'no_scene',
        element: <NoScenePanel />,
      },
    ],
  },
];
