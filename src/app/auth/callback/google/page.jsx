// src/app/auth/callback/google-token/page.jsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { API_URL } from "@/app/config";

export default function GoogleTokenCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Cerrar browser inmediatamente
      if (window.Capacitor) {
        await Browser.close();
      }

      // Para response_type=token, el token viene en el hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');

      console.log('🔧 Token callback - accessToken:', accessToken ? 'RECIBIDO' : 'NO');

      if (error) {
        toast.error("Error de Google: " + error);
        router.push("/login");
        return;
      }

      if (!accessToken) {
        toast.error("No se recibió token de acceso");
        router.push("/login");
        return;
      }

      try {
        // Obtener info del usuario directamente con el token
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        const userData = await userResponse.json();

        // Login con Strapi
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: userData.email, 
            googleId: userData.sub, 
            name: userData.name 
          }),
        });

        const authData = await authRes.json();
        
        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        
        toast.success(`¡Bienvenido ${authData.user?.username}!`);
        router.push("/");

      } catch (err) {
        console.error("Token callback error:", err);
        toast.error("Error en autenticación: " + err.message);
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando token de Google…</div>
    </div>
  );
}