import { useEffect } from 'react';

export const useDeepLinks = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Escuchar eventos de Capacitor para deep links
    if (window.Capacitor && window.Capacitor.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
        const url = new URL(data.url);
        console.log('App opened with URL:', url);
        
        // Manejar callback de Discord
        if (url.pathname.includes('auth/callback/discord')) {
          const code = url.searchParams.get('code');
          if (code) {
            console.log('Discord callback code:', code);
            if (window.Capacitor.Plugins?.Browser) {
              window.Capacitor.Plugins.Browser.close();
            }
            window.dispatchEvent(new CustomEvent('discordAuthCallback', {
              detail: { code }
            }));
          }
        }
        
        // Manejar callback de Google
        if (url.pathname.includes('/auth/callback/google')) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const error = hashParams.get('error');
          
          if (accessToken) {
            console.log('Google callback access token:', accessToken);
            if (window.Capacitor.Plugins?.Browser) {
              window.Capacitor.Plugins.Browser.close();
            }
            window.dispatchEvent(new CustomEvent('googleAuthCallback', {
              detail: { accessToken }
            }));
          } else if (error) {
            console.error('Google auth error:', error);
            window.dispatchEvent(new CustomEvent('authError', {
              detail: { error }
            }));
          }
        }
      });
    }

    return () => {
      if (window.Capacitor && window.Capacitor.Plugins?.App) {
        window.Capacitor.Plugins.App.removeAllListeners();
      }
    };
  }, []);
};