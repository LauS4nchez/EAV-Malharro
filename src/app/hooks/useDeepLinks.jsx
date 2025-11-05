import { useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { toast } from 'react-hot-toast';

export const useDeepLinks = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Escuchar eventos de Capacitor para deep links
    if (window.Capacitor && window.Capacitor.Plugins?.App) {
      const handleAppUrlOpen = (data) => {
        try {
          const url = new URL(data.url);
          console.log('🔧 Deep link recibido:', url.toString());

          // Manejar callback de Discord
          if (url.protocol === 'malharro:' && url.host === 'auth' && url.pathname.includes('/callback/discord')) {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (code) {
              // Cerrar el browser
              Browser.close();
              // Disparar evento para procesar el login
              window.dispatchEvent(new CustomEvent('discordAuthCallback', {
                detail: { code }
              }));
            } else if (error) {
              console.error('Discord auth error:', error);
              Browser.close();
              window.dispatchEvent(new CustomEvent('authError', {
                detail: { error, provider: 'discord' }
              }));
            }
          }
          
          // Manejar callback de Google
          if (url.protocol === 'malharro:' && url.host === 'auth' && url.pathname.includes('/callback/google')) {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            console.log('🔧 Google callback - code:', code, 'error:', error);

            if (code) {
              Browser.close();
              window.dispatchEvent(new CustomEvent('googleAuthCallback', {
                detail: { code }
              }));
            } else if (error) {
              console.error('Google auth error:', error);
              Browser.close();
              window.dispatchEvent(new CustomEvent('authError', {
                detail: { error, provider: 'google' }
              }));
            }
          }

          // Manejar regreso de login exitoso desde el callback web
          if (url.protocol === 'malharro:' && url.host === 'login') {
            // Login exitoso completo
            if (url.pathname.includes('/success')) {
              const jwt = url.searchParams.get('jwt');
              const userParam = url.searchParams.get('user');
              
              console.log('🔧 Login exitoso - JWT:', jwt ? 'RECIBIDO' : 'NO RECIBIDO');
              
              if (jwt && userParam) {
                try {
                  const user = JSON.parse(decodeURIComponent(userParam));
                  
                  // Guardar sesión en la app
                  localStorage.setItem("jwt", jwt);
                  localStorage.setItem("userRole", user.role?.name || "Authenticated");
                  
                  console.log('✅ Login exitoso desde deep link - Usuario:', user.username);
                  
                  // Mostrar toast de éxito
                  toast.success(`¡Bienvenido ${user.username || 'Usuario'}!`);
                  
                  // Disparar evento para que los componentes se actualicen
                  window.dispatchEvent(new CustomEvent('authSuccess', {
                    detail: { user, jwt }
                  }));

                } catch (error) {
                  console.error('Error procesando login exitoso:', error);
                  toast.error('Error al procesar el login');
                }
              }
            } 
            // Necesita configurar contraseña
            else if (url.pathname.includes('/setPassword')) {
              const email = url.searchParams.get('email');
              const jwt = url.searchParams.get('jwt');
              
              console.log('🔧 SetPassword required - email:', email);
              
              if (email && jwt) {
                // Guardar en localStorage para que el Login.jsx lo detecte
                localStorage.setItem("pendingGoogleAuth", JSON.stringify({
                  email: decodeURIComponent(email),
                  jwt: decodeURIComponent(jwt)
                }));
                
                // Disparar evento para que el Login.jsx cambie a setPassword
                window.dispatchEvent(new CustomEvent('authSetPassword', {
                  detail: { 
                    email: decodeURIComponent(email), 
                    jwt: decodeURIComponent(jwt),
                    provider: 'google'
                  }
                }));
                
                toast.info('Configura tu usuario y contraseña');
              }
            }
            // Error de login
            else {
              const error = url.searchParams.get('error');
              if (error) {
                console.error('❌ Error de login desde deep link:', error);
                toast.error('Error en login: ' + decodeURIComponent(error));
                
                // Disparar evento de error
                window.dispatchEvent(new CustomEvent('authError', {
                  detail: { error: decodeURIComponent(error) }
                }));
              }
            }
          }

        } catch (error) {
          console.error('Error processing deep link:', error);
        }
      };

      window.Capacitor.Plugins.App.addListener('appUrlOpen', handleAppUrlOpen);

      return () => {
        if (window.Capacitor && window.Capacitor.Plugins?.App) {
          window.Capacitor.Plugins.App.removeAllListeners();
        }
      };
    }

    // También manejar eventos personalizados para auth
    const handleAuthSuccess = (event) => {
      console.log('✅ Auth success event received:', event.detail);
      // Aquí puedes agregar lógica adicional cuando el login es exitoso
    };

    const handleAuthError = (event) => {
      console.error('❌ Auth error event received:', event.detail);
      // Aquí puedes agregar lógica adicional cuando hay error de login
    };

    const handleAuthSetPassword = (event) => {
      console.log('🔧 Auth setPassword event received:', event.detail);
      // Este evento será manejado por el Login.jsx
    };

    window.addEventListener('authSuccess', handleAuthSuccess);
    window.addEventListener('authError', handleAuthError);
    window.addEventListener('authSetPassword', handleAuthSetPassword);

    return () => {
      window.removeEventListener('authSuccess', handleAuthSuccess);
      window.removeEventListener('authError', handleAuthError);
      window.removeEventListener('authSetPassword', handleAuthSetPassword);
    };
  }, []);
};