import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, { getDirection } from './i18n';
import App from './App.tsx';
import { AuthProvider } from './app/layout/AuthProvider';
import { RoleProvider } from './app/router';
import { ThemeProvider } from './app/layout/ThemeProvider';
import './styles/index.css';

async function registerSW() {
  // The service worker is only meaningful on a real origin build. Registering
  // the raw /sw.ts source errors in dev (wrong MIME type) and inside the nginx
  // Docker build (Vite does not emit sw.ts there), so be strict about when we
  // even attempt it: production builds only.
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    // PWA is progressive enhancement — a failed registration must never break
    // the app or spam the console (it broke Playwright browser teardown).
    if (import.meta.env.DEV) console.warn('SW registration skipped:', err);
  }
}

function Root() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = getDirection(i18n.language);
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <App />;
}

registerSW();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <BrowserRouter basename="/">
              <Root />
            </BrowserRouter>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
);


