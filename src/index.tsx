import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { KiwiApp } from '@/app/api';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from '@/app/router/AppRouter';
import { appRoutes } from '@/app/routes';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // In StrictMode, React renders each component twice while in development mode.
  // Further info: https://stackoverflow.com/questions/61254372/my-react-component-is-rendering-twice-because-of-strict-mode/61897567#61897567
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter
        routes={appRoutes}
        indexRedirect="home"
        fallbackRedirect="home"
      />
      <KiwiApp />
    </BrowserRouter>
  </React.StrictMode>
);
