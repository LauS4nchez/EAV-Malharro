// hooks/useGoogleAuthCross.ts
'use client';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth as GoogleNative } from '@codetrix-studio/capacitor-google-auth';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';

type Ctx = {
  setStep: (s: string) => void;
  setEmail: (e: string) => void;
  setLoading: (v: boolean) => void;
  router: { push: (p: string) => void };
};

export function useGoogleAuthCross({ setStep, setEmail, setLoading, router }: Ctx) {
  // --- WEB (tu flujo actual, sin tocar) ---
  const webLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const googleUser = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const { email, name, sub: googleId } = googleUser.data;

        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, googleId, name }),
          credentials: 'include',
        });

        const responseText = await authRes.text();
        if (!authRes.ok) throw new Error(responseText);

        const authData = JSON.parse(responseText);

        if (authData.user?.loginMethods !== 'both') {
          setEmail(authData.user.email);
          setStep('setPassword');
          toast('Configura tu usuario y contraseña para poder iniciar sesión manualmente.');
          return;
        }

        localStorage.setItem('jwt', authData.jwt);
        localStorage.setItem('userRole', authData.user?.role?.name || 'Authenticated');
        toast.success(`¡Bienvenido ${authData.user?.username}!`);
        router.push('/');
      } catch (err) {
        console.error('Error Google Login (web):', err);
        toast.error('Error al ingresar con Google.');
      } finally {
        setLoading(false);
      }
    },
    onError: (e) => {
      console.error('Error Google OAuth (web):', e);
      toast.error('Falló el login con Google');
    },
  });

  // --- NATIVO (Capacitor / APK) ---
  const nativeLogin = async () => {
    try {
      setLoading(true);

      // Abre el diálogo nativo de Google y devuelve idToken + basic profile
      const res = await GoogleNative.signIn();
      const idToken = res?.authentication?.idToken;
      const email = res?.email;
      const name = res?.name;

      if (!idToken) throw new Error('No idToken devuelto por Google');

      // En móvil, lo correcto es mandar el idToken al backend y verificarlo allí
      const authRes = await fetch(`${API_URL}/google-auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, email, name }),
        credentials: 'include',
      });

      const responseText = await authRes.text();
      if (!authRes.ok) throw new Error(responseText);

      const authData = JSON.parse(responseText);

      if (authData.user?.loginMethods !== 'both') {
        setEmail(authData.user.email);
        setStep('setPassword');
        toast('Configura tu usuario y contraseña para poder iniciar sesión manualmente.');
        return;
      }

      localStorage.setItem('jwt', authData.jwt);
      localStorage.setItem('userRole', authData.user?.role?.name || 'Authenticated');
      toast.success(`¡Bienvenido ${authData.user?.username}!`);
      router.push('/');
    } catch (err) {
      console.error('Error Google Login (nativo):', err);
      toast.error('Error al ingresar con Google (app).');
    } finally {
      setLoading(false);
    }
  };

  // Te devolvemos una sola función que el botón pueda llamar
  const signIn = () => {
    if (Capacitor.isNativePlatform()) {
      return nativeLogin();
    }
    return webLogin(); // dispara el flujo web
  };

  return { signIn };
}
