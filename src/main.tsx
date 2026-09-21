import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataProvider } from './context/DataContext';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Register service worker with auto-update in production environments
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[POLARX PWA] New version available.');
      },
      onOfflineReady() {
        console.log('[POLARX PWA] App ready to work offline with full local IndexedDB capability.');
      },
    });
  } catch (err) {
    console.warn('[POLARX PWA] Service worker registration deferred:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

