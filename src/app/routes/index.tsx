import { Navigate } from 'react-router-dom';
import AppBody from '../AppBody';
import { WorkspacePage } from '@/features/workspace/api';
import { RouteProp } from '../router/types';

export const appRoutes: RouteProp[] = [
  {
    path: '/',
    element: <AppBody />,
    children: [
      {
        path: 'home',
        element: <Navigate to="/main" replace />,
      },
      {
        path: 'main/*',
        element: <WorkspacePage />,
      },
    ],
  },
];
