import AppBody from '../AppBody';
import { WorkspacePage } from '@/features/workspace/api';
import { RouteProp } from '../router/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      { path: 'cinema', element: <WorkspacePage /> },
      {
        path: 'main/*',
        element: <WorkspacePage />,
      },
    ],
  },
];
