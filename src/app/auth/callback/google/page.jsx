"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, clientIDGoogle, clientSecretGoogle } from "@/app/config";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        alert('🔧 PASO 1: Callback iniciado');
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        // MOSTRAR INFORMACIÓN CRÍTICA
        alert('🔧 PASO 2: Code recibido: ' + code);
        alert('🔧 Client ID: ' + (clientIDGoogle ? 'CONFIGURADO' : 'NO CONFIGURADO'));
        alert('🔧 Client Secret: ' + (clientSecretGoogle ? 'CONFIGURADO' : 'NO CONFIGURADO'));

        if (error) {
          alert('❌ ERROR de Google: ' + error);
          throw new Error(`Google auth error: ${error}`);
        }

        if (!code) {
          alert('❌ NO hay código de Google');
          throw new Error("No se recibió código de autorización de Google");
        }

        // 1. Cerrar el browser si estamos en mobile
        alert('🔧 PASO 3: Cerrando browser...');
        if (window.Capacitor) {
          await Browser.close();
          alert('✅ Browser cerrado');
        }

        // 2. Intercambiar code por token
        alert('🔧 PASO 4: Intercambiando code por token...');
        const tokenResponse = await fetch("/api/google/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code, 
            redirectUri: window.location.origin + "/auth/callback/google" 
          }),
        });

        alert('🔧 PASO 4.1: Respuesta del API - Status: ' + tokenResponse.status);
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          alert('❌ ERROR en intercambio de token: ' + errorText);
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        alert('🔧 PASO 4.2: Token recibido: ' + (tokenData.access_token ? 'SÍ' : 'NO'));

        if (!tokenData.access_token) {
          alert('❌ NO hay access token en la respuesta');
          throw new Error("No access token received from Google");
        }

        // 3. Obtener info del usuario
        alert('🔧 PASO 5: Obteniendo info del usuario de Google...');
        const googleUser = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        alert('🔧 PASO 5.1: Info de usuario recibida: ' + (googleUser.data.email ? 'SÍ' : 'NO'));
        
        if (!googleUser.data.email) {
          alert('❌ NO hay email en la info del usuario');
          throw new Error("No email received from Google");
        }

        const { email, name, sub: googleId } = googleUser.data;

        // 4. Login con Strapi
        alert('🔧 PASO 6: Enviando a Strapi...');
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
        });

        alert('🔧 PASO 6.1: Respuesta de Strapi - Status: ' + authRes.status);
        
        const authText = await authRes.text();
        alert('🔧 PASO 6.2: Texto de respuesta Strapi: ' + authText.substring(0, 100));
        
        if (!authRes.ok) {
          alert('❌ ERROR de Strapi: ' + authText);
          throw new Error(authText || 'Error del servidor Strapi');
        }

        const authData = JSON.parse(authText);
        alert('🔧 PASO 6.3: JWT recibido: ' + (authData.jwt ? 'SÍ' : 'NO'));

        // 5. Guardar sesión y redirigir
        alert('🔧 PASO 7: Guardando sesión...');
        if (!authData.jwt) {
          alert('❌ NO hay JWT de Strapi');
          throw new Error("No JWT received from Strapi");
        }

        localStorage.setItem("jwt", authData.jwt);
        localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
        
        alert('✅ PASO 8: Login EXITOSO! Redirigiendo...');
        
        toast.success(`¡Bienvenido ${authData.user?.username || 'Usuario'}!`);
        
        // Redirigir
        if (window.Capacitor) {
          router.push("/");
        } else {
          window.location.href = "/";
        }

      } catch (err) {
        alert('❌ ERROR FINAL: ' + err.message);
        
        if (window.Capacitor) {
          await Browser.close();
        }
        
        toast.error("Error: " + err.message);
        
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