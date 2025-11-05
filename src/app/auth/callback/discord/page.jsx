"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { discordService } from "@/app/services/discordService";
import { API_URL, getDiscordRedirectUri, clientIDDiscord, clientSecretDiscord } from "@/app/config";

export default function DiscordCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        alert('🔧 PASO 1: Discord callback iniciado');
        
        // VERIFICAR CREDENCIALES
        alert('🔧 Credenciales Discord - Client ID: ' + (clientIDDiscord ? 'CONFIGURADO' : 'NO CONFIGURADO'));
        alert('🔧 Credenciales Discord - Client Secret: ' + (clientSecretDiscord ? 'CONFIGURADO' : 'NO CONFIGURADO'));
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        alert('🔧 PASO 2: Code recibido: ' + code);

        if (error) {
          alert('❌ ERROR de Discord: ' + error);
          throw new Error(`Discord auth error: ${error}`);
        }

        if (!code) {
          alert('❌ NO hay código de Discord');
          throw new Error("No se recibió código de autorización de Discord");
        }

        // Cerrar browser si estamos en mobile
        alert('🔧 PASO 3: Cerrando browser...');
        if (window.Capacitor) {
          await Browser.close();
          alert('✅ Browser cerrado');
        }

        // Intercambiar code por token
        alert('🔧 PASO 4: Intercambiando code por token...');
        const redirectUri = getDiscordRedirectUri();
        alert('🔧 Redirect URI: ' + redirectUri);
        
        const tokenData = await discordService.getAccessToken(code, redirectUri);
        
        alert('🔧 PASO 4.1: Token recibido: ' + (tokenData.access_token ? 'SÍ' : 'NO'));

        if (!tokenData.access_token) {
          alert('❌ NO hay access token en la respuesta: ' + JSON.stringify(tokenData));
          throw new Error("No access token received from Discord: " + JSON.stringify(tokenData));
        }

        // Obtener info del usuario
        alert('🔧 PASO 5: Obteniendo info del usuario de Discord...');
        const discordUser = await discordService.getUserInfo(tokenData.access_token);
        
        alert('🔧 PASO 5.1: Info de usuario recibida - Email: ' + (discordUser.email ? discordUser.email : 'NO'));
        alert('🔧 PASO 5.2: Info completa: ' + JSON.stringify({
          id: discordUser.id,
          username: discordUser.username,
          global_name: discordUser.global_name,
          email: discordUser.email
        }));

        if (!discordUser.email) {
          alert('❌ NO hay email en la info del usuario');
          throw new Error("No email received from Discord");
        }

        // Login con Strapi
        alert('🔧 PASO 6: Enviando a Strapi...');
        const authRes = await fetch(`${API_URL}/discord-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: discordUser.email,
            discordId: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            discordUsername: discordUser.username,
            avatar: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
          }),
        });

        alert('🔧 PASO 6.1: Respuesta de Strapi - Status: ' + authRes.status);
        
        const responseText = await authRes.text();
        alert('🔧 PASO 6.2: Texto de respuesta Strapi: ' + responseText);
        
        if (!authRes.ok) {
          alert('❌ ERROR de Strapi: ' + responseText);
          throw new Error(responseText);
        }

        const authData = JSON.parse(responseText);
        alert('🔧 PASO 6.3: JWT recibido: ' + (authData.jwt ? 'SÍ' : 'NO'));
        alert('🔧 PASO 6.4: Login Methods: ' + (authData.user?.loginMethods || 'NO'));

        // VERIFICAR SI NECESITA SET PASSWORD
        if (authData.user?.loginMethods !== "both") {
          // Usuario necesita configurar contraseña
          alert('🔧 Usuario necesita setPassword');
          
          if (window.Capacitor) {
            // Redirigir a la app con información para setPassword
            const appUrl = `malharro://login/setPassword?email=${encodeURIComponent(authData.user.email)}&jwt=${encodeURIComponent(authData.jwt)}&provider=discord`;
            alert('🔧 Redirigiendo a setPassword: ' + appUrl);
            window.location.href = appUrl;
          } else {
            // En web - guardar en localStorage y redirigir a setPassword
            localStorage.setItem("pendingDiscordAuth", JSON.stringify({
              email: authData.user.email,
              jwt: authData.jwt
            }));
            router.push("/login?step=setPassword");
          }
        } else {
          // Login completo - usuario ya tiene ambos métodos
          alert('✅ Login completo, usuario tiene ambos métodos');
          
          if (window.Capacitor) {
            // Redirigir a la app con éxito completo
            const appUrl = `malharro://login/success?jwt=${encodeURIComponent(authData.jwt)}&user=${encodeURIComponent(JSON.stringify(authData.user))}`;
            alert('🔧 Redirigiendo a success: ' + appUrl);
            window.location.href = appUrl;
          } else {
            // En web - login completo
            localStorage.setItem("jwt", authData.jwt);
            localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
            toast.success(`¡Bienvenido ${authData.user?.username || discordUser.username}!`);
            router.push("/");
          }
        }

      } catch (err) {
        console.error("❌ Discord callback error:", err);
        alert('❌ ERROR FINAL: ' + (err.message || 'Error sin mensaje - Revisa la consola'));
        
        if (window.Capacitor) {
          // Redirigir a la app con error
          const errorUrl = `malharro://login?error=${encodeURIComponent(err.message || 'Error desconocido')}`;
          window.location.href = errorUrl;
        } else {
          toast.error("Error en autenticación: " + (err.message || 'Error desconocido'));
          router.push("/login");
        }
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando autenticación de Discord…</div>
    </div>
  );
}