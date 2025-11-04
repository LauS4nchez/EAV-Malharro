"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { API_URL } from "@/app/config"; // ← Solo API_URL

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Cerrar browser inmediatamente (sin await)
      if (window.Capacitor) {
        Browser.close();
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      
      if (!code) {
        toast.error("No se recibió código de autorización");
        router.push("/login");
        return;
      }

      try {
        // Intercambiar code por token
        const tokenResponse = await fetch("/api/google/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code: code,
            redirectUri: 'https://eav-malharro.onrender.com/auth/callback/google'
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Error del servidor: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          throw new Error("No se recibió token de acceso");
        }

        // Obtener info del usuario
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        
        if (!userResponse.ok) {
          throw new Error("Error al obtener información del usuario");
        }

        const userData = await userResponse.json();

        // Login con Strapi
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: userData.email, 
            googleId: userData.sub, 
            name: userData.name || userData.email.split('@')[0]
          }),
        });

        if (!authRes.ok) {
          const errorText = await authRes.text();
          throw new Error(`Error Strapi: ${errorText}`);
        }

        const authData = await authRes.json();
        
        // Guardar sesión y redirigir
        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        
        toast.success(`¡Bienvenido ${authData.user?.username || userData.name}!`);
        router.push("/");

      } catch (err) {
        console.error("Google callback error:", err);
        toast.error("Error en autenticación: " + err.message);
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