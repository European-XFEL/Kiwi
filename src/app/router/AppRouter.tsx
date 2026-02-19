import { Routes, Route, Navigate } from 'react-router-dom';
import { RouteProp, RouterProp } from './types';

export default function AppRouter({
  routes,
  indexRedirect,
  fallbackRedirect,
  redirects = [],
}: RouterProp) {
  const renderRoute = (route: RouteProp) => (
    <Route key={route.path} path={route.path} element={route.element}>
      {route.children?.map(renderRoute)}
    </Route>
  );

  return (
    <Routes>
      {routes.map(renderRoute)}

      {/* Custom redirects */}
      {redirects.map((redirect) => (
        <Route
          key={redirect.from}
          path={redirect.from}
          element={
            <Navigate replace={redirect.replace ?? true} to={redirect.to} />
          }
        />
      ))}

      {/* Index redirect */}
      {indexRedirect && (
        <Route index element={<Navigate replace to={indexRedirect} />} />
      )}

      {/* Fallback redirect for unmatched routes */}
      {fallbackRedirect && (
        <Route path="*" element={<Navigate replace to={fallbackRedirect} />} />
      )}
    </Routes>
  );
}
