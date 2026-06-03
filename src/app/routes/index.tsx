import AppBody from '../AppBody';
import NoScenePanel from '../NoScenePanel';
import { ScenePage } from '@/features/scene-view/api';
import { RouteProp } from '../router/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      {
        path: 'scene',
        element: <ScenePage />,
      },
      {
        path: 'no_scene',
        element: <NoScenePanel />,
      },
    ],
  },
];
