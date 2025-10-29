"use client";
import { useEffect } from "react";
import { discordService } from "@/app/services/discordService";

export default function DiscordCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No se recibió código de autorización');
        }

        // Obtener token y datos de usuario
        const tokenData = await discordService.getAccessToken(code);
        const discordUser = await discordService.getUserInfo(tokenData.access_token);
        const authData = await discordService.handleDiscordAuth(discordUser);

        // Verificar si el usuario necesita configurar contraseña
        if (authData.user && authData.user.loginMethods && authData.user.loginMethods !== "both") {
          // Enviar mensaje de que necesita contraseña
          if (window.opener) {
            window.opener.postMessage({
              type: 'DISCORD_AUTH_NEEDS_PASSWORD',
              email: authData.user.email,
              jwt: authData.jwt,
              userData: authData.user
            }, window.location.origin);
          }
        } else {
          // Login completo - enviar éxito
          if (window.opener) {
            window.opener.postMessage({
              type: 'DISCORD_AUTH_SUCCESS',
              user: authData.user,
              jwt: authData.jwt
            }, window.location.origin);
          }
        }

        // Cerrar popup después de enviar mensaje
        setTimeout(() => {
          window.close();
        }, 1000);

      } catch (error) {
        console.error('Error en callback Discord:', error);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'DISCORD_AUTH_ERROR',
            error: error.message
          }, window.location.origin);
        }
        
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-lg">Procesando autenticación de Discord...</div>
    </div>
  );
}