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

function Root() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = getDirection(i18n.language);
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <App />;
}

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


