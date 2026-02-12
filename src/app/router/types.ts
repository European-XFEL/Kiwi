//routes props
import { ReactElement } from 'react';

export type RouteProp = {
  path: string;
  element: ReactElement;
  children?: RouteProp[];
};

export type RedirectProp = {
  from: string;
  to: string;
  replace?: boolean;
};

export type RouterProp = {
  routes: RouteProp[];
  indexRedirect?: string;
  fallbackRedirect?: string;
  redirects?: RedirectProp[];
};
