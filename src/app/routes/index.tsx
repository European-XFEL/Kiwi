import AppBody from '../AppBody';
import { LandingPage, PanelWrangler } from '@/features/scene-view/api';
import { RouteProp } from '../router/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      {
        path: 'scene',
        element: <PanelWrangler />,
      },
      {
        path: 'home',
        element: <LandingPage />,
      },
    ],
  },
];
