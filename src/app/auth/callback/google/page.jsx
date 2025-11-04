"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "@/app/config";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          console.error('❌ Google auth error:', error);
          toast.error("Error de autenticación con Google");
          router.push("/login");
          return;
        }

        if (!code) {
          console.error('❌ No code received from Google');
          toast.error("No se recibió código de autorización");
          router.push("/login");
          return;
        }

        console.log('🔧 Google callback code received');

        // Intercambiar code por token
        const tokenResponse = await fetch("/api/google/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code, 
            redirectUri: window.location.origin + "/auth/callback/google" 
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to get token from Google');
        }

        const tokenData = await tokenResponse.json();
        console.log('🔧 Google token data:', tokenData);

        // Obtener info del usuario
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        console.log('🔧 Google user info:', googleUser.data);
        const { email, name, sub: googleId } = googleUser.data;

        // Login con Strapi
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
        });

        const authText = await authRes.text();
        if (!authRes.ok) throw new Error(authText);
        
        const authData = JSON.parse(authText);
        console.log('🔧 Strapi auth result:', authData);

        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        
        toast.success(`¡Bienvenido ${authData.user?.username}!`);
        router.push("/");

      } catch (err) {
        console.error("❌ Google callback error:", err);
        toast.error("Error en el proceso de autenticación");
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando autenticación de Google…</div>
    </div>
  );
}