"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "@/app/config";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔧 Google callback started');
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");
        const state = urlParams.get("state");

        console.log('🔧 Google callback params:', { code, error, state });

        // Alertas para debugging
        if (window.alert) {
          alert('🔧 Google callback - code: ' + (code ? 'RECIBIDO' : 'NO RECIBIDO'));
        }

        if (error) {
          throw new Error(`Google auth error: ${error}`);
        }

        if (!code) {
          throw new Error("No se recibió código de autorización de Google");
        }

        // 1. Cerrar el browser si estamos en mobile
        if (window.Capacitor && Browser) {
          await Browser.close();
          console.log('🔧 Browser closed');
        }

        // 2. Intercambiar code por token
        console.log('🔧 Exchanging code for token...');
        const tokenResponse = await fetch("/api/google/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code, 
            redirectUri: window.location.origin + "/auth/callback/google" 
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ Token exchange error:', errorText);
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('🔧 Token received:', tokenData);

        if (!tokenData.access_token) {
          throw new Error("No access token received from Google");
        }

        // 3. Obtener info del usuario
        console.log('🔧 Getting user info from Google...');
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        console.log('🔧 Google user info:', googleUser.data);
        
        if (!googleUser.data.email) {
          throw new Error("No email received from Google");
        }

        const { email, name, sub: googleId } = googleUser.data;

        // 4. Login con Strapi
        console.log('🔧 Sending to Strapi...');
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
        });

        const authText = await authRes.text();
        console.log('🔧 Strapi response status:', authRes.status);
        console.log('🔧 Strapi response text:', authText);
        
        if (!authRes.ok) {
          throw new Error(authText || 'Error del servidor Strapi');
        }

        const authData = JSON.parse(authText);
        console.log('🔧 Strapi auth result:', authData);

        // 5. Guardar sesión y redirigir
        if (!authData.jwt) {
          throw new Error("No JWT received from Strapi");
        }

        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        
        if (window.alert) {
          alert('✅ Login exitoso! Redirigiendo...');
        }
        
        toast.success(`¡Bienvenido ${authData.user?.username || 'Usuario'}!`);
        
        // Redirigir a la página principal
        if (window.Capacitor) {
          // En mobile, usa el router
          router.push("/");
        } else {
          // En web
          window.location.href = "/";
        }

      } catch (err) {
        console.error("❌ Google callback error:", err);
        
        if (window.alert) {
          alert('❌ Error en callback: ' + err.message);
        }
        
        // Cerrar browser en caso de error
        if (window.Capacitor && Browser) {
          await Browser.close();
        }
        
        toast.error("Error en el proceso de autenticación: " + err.message);
        
        // Redirigir al login
        if (window.Capacitor) {
          router.push("/login");
        } else {
          window.location.href = "/login";
        }
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