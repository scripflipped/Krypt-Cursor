import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './state/ToastProvider';
import { ModalProvider } from './state/ModalProvider';
import { AppStateProvider } from './state/AppStateProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ModalProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </ModalProvider>
    </ToastProvider>
  </React.StrictMode>,
);
