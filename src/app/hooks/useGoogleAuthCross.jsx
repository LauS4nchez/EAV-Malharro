"use client";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, clientIDGoogle } from "../config";

export function useGoogleAuthCross({ setStep, setEmail, setLoading, router }) {
  // WEB (tu flujo actual con @react-oauth/google)
  const webLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const { email, name, sub: googleId } = googleUser.data;

        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
          credentials: "include",
        });

        const text = await authRes.text();
        if (!authRes.ok) throw new Error(text);
        const authData = JSON.parse(text);

        if (authData.user?.loginMethods !== "both") {
          setEmail(authData.user.email);
          setStep("setPassword");
          toast("Configura usuario y contraseña para login manual.");
          return;
        }

        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        toast.success(`¡Bienvenido ${authData.user?.username}!`);
        router.push("/");
      } catch (err) {
        console.error("Error Google Login (web):", err);
        toast.error("Error al ingresar con Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (e) => {
      console.error("Error Google OAuth (web):", e);
      toast.error("Falló el login con Google");
    },
  });

  // NATIVO (Capacitor/Android)
  const nativeLogin = async () => {
    try {
      setLoading(true);

      // Importante: inicializar UNA vez con el webClientId (de Google Console)
      await SocialLogin.initialize({
        google: { webClientId: clientIDGoogle },
      });

      // Abre el flujo nativo de Google (Custom Tabs + Play Services)
      const res = await SocialLogin.login({ provider: "google", options: {} });
      // La respuesta incluye credenciales; normalmente tendrás idToken y/o accessToken
      const { idToken, accessToken, email, name } = res ?? {};

      if (!idToken && !accessToken) throw new Error("Sin tokens de Google");

      // Envía tokens a tu backend para verificar en servidor
      const authRes = await fetch(`${API_URL}/google-auth/mobile-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, accessToken, email, name }),
        credentials: "include",
      });

      const text = await authRes.text();
      if (!authRes.ok) throw new Error(text);
      const authData = JSON.parse(text);

      if (authData.user?.loginMethods !== "both") {
        setEmail(authData.user.email);
        setStep("setPassword");
        toast("Configura usuario y contraseña para login manual.");
        return;
      }

      localStorage.setItem("jwt", authData.jwt);
      localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
      toast.success(`¡Bienvenido ${authData.user?.username}!`);
      router.push("/");
    } catch (err) {
      console.error("Error Google Login (nativo):", err);
      toast.error("Error al ingresar con Google (app).");
    } finally {
      setLoading(false);
    }
  };

  const signIn = () => (Capacitor.isNativePlatform() ? nativeLogin() : webLogin());
  return { signIn };
}
