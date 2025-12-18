/**
 * T029: GREEN - React app entry point with providers.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ReduxProvider } from './providers/ReduxProvider';
import { QueryProvider } from './providers/QueryProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ReduxProvider>
  </StrictMode>
);
