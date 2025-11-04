import { useEffect } from 'react';
import { Browser } from '@capacitor/browser';

export const useDeepLinks = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Escuchar eventos de Capacitor para deep links
    if (window.Capacitor && window.Capacitor.Plugins?.App) {
      const handleAppUrlOpen = (data) => {
        try {
          const url = new URL(data.url);
          console.log('🔧 Deep link received:', url.toString());

          // Alertas para debugging
          if (window.alert) {
            alert('🔧 Deep link recibido: ' + url.toString());
          }
          
          // Manejar callback de Google
          if (url.protocol === 'malharro:' && url.host === 'auth' && url.pathname.includes('/callback/google')) {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            console.log('🔧 Google callback - code:', code, 'error:', error);

            if (window.alert) {
              alert('🔧 Google callback - code: ' + code);
            }

            if (code) {
              // Cerrar el browser
              Browser.close();
              // Disparar evento para procesar el login
              window.dispatchEvent(new CustomEvent('googleAuthCallback', {
                detail: { code }
              }));
            } else if (error) {
              console.error('Google auth error:', error);
              window.dispatchEvent(new CustomEvent('authError', {
                detail: { error, provider: 'google' }
              }));
            }
          }
          
          // Manejar callback de Discord
          if (url.protocol === 'malharro:' && url.host === 'auth' && url.pathname.includes('/callback/discord')) {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            console.log('🔧 Discord callback - code:', code, 'error:', error);

            if (window.alert) {
              alert('🔧 Discord callback - code: ' + code);
            }

            if (code) {
              Browser.close();
              window.dispatchEvent(new CustomEvent('discordAuthCallback', {
                detail: { code }
              }));
            } else if (error) {
              console.error('Discord auth error:', error);
              window.dispatchEvent(new CustomEvent('authError', {
                detail: { error, provider: 'discord' }
              }));
            }
          }
        } catch (error) {
          console.error('Error processing deep link:', error);
        }
      };

      window.Capacitor.Plugins.App.addListener('appUrlOpen', handleAppUrlOpen);

      return () => {
        window.Capacitor.Plugins.App.removeAllListeners();
      };
    }
  }, []);
};