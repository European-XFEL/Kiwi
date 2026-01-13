import AppBody from '../AppBody';
import NoScenePanel from '../NoScenePanel';
import { SceneCanvas } from '@/features/scene_view';
import { RouteProp } from '@/shared/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      {
        path: 'scene',
        element: <SceneCanvas />,
      },
      {
        path: 'no_scene',
        element: <NoScenePanel />,
      },
    ],
  },
];
