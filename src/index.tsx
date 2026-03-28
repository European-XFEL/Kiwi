import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { KiwiApp } from '@/app/api';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // In StrictMode, React renders each component twice while in development mode.
  // Further info: https://stackoverflow.com/questions/61254372/my-react-component-is-rendering-twice-because-of-strict-mode/61897567#61897567
  <React.StrictMode>
    <KiwiApp />
  </React.StrictMode>
);
