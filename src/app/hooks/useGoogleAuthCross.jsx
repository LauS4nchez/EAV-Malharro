"use client";
import { Capacitor } from "@capacitor/core";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config";

export function useGoogleAuthCross({ setStep, setEmail, setLoading, router }) {
  
  // MISMO CÓDIGO para web y mobile (WebView)
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        console.log('🔧 Google login started, getting user info...');
        
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        
        console.log('🔧 Google user data:', googleUser.data);
        
        const { email, name, sub: googleId } = googleUser.data;

        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
          credentials: "include",
        });

        const text = await authRes.text();
        console.log('🔧 Strapi response:', text);
        
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
        console.error("❌ Error Google Login:", err);
        toast.error("Error al ingresar con Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (e) => {
      console.error("❌ Error Google OAuth:", e);
      toast.error("Falló el login con Google");
    },
  });

  const signIn = () => googleLogin();
  return { signIn };
}