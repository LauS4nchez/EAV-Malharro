"use client";
import { useGoogleLogin } from "@react-oauth/google";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { API_URL } from "../config";
import axios from "axios";
import { toast } from "react-hot-toast";

export const useGoogleAuth = (setStep, setEmail, setLoading, router) => {
  // --- WEB normal ---
  const webGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const googleUser = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const { email, name, sub: googleId } = googleUser.data;

        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
        });

        const responseText = await authRes.text();

        if (authRes.ok) {
          const authData = JSON.parse(responseText);

          if (authData.user.loginMethods !== "both") {
            setEmail(authData.user.email);
            setStep("setPassword");
            toast("Configura tu usuario y contraseña para poder iniciar sesión manualmente.");
            return;
          }

          localStorage.setItem("jwt", authData.jwt);
          localStorage.setItem("userRole", authData.user.role?.name || "Authenticated");
          toast.success(`¡Bienvenido ${authData.user.username}!`);
          router.push("/");
        } else {
          throw new Error(responseText);
        }
      } catch (error) {
        console.error("Error Google Login:", error);
        toast.error("Error al ingresar con Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Error Google OAuth:", error);
      toast.error("Falló el login con Google");
    },
  });

  // --- APK / Capacitor ---
  const nativeGoogleLogin = async () => {
    try {
      const loginUrl = `${API_URL}/google-auth/start`; // endpoint que inicia OAuth
      await Browser.open({ url: loginUrl });
    } catch (err) {
      console.error("Error al abrir login Google:", err);
      toast.error("No se pudo abrir el inicio de sesión con Google.");
    }
  };

  // --- Selector automático ---
  return () => {
    if (Capacitor.isNativePlatform()) {
      nativeGoogleLogin();
    } else {
      webGoogleLogin();
    }
  };
};
