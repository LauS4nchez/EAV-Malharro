"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { discordService } from "@/app/services/discordService";
import { API_URL, getDiscordRedirectUri } from "@/app/config"; // ← Solo estas

export default function DiscordCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");

        if (error) {
          throw new Error(`Discord auth error: ${error}`);
        }

        if (!code) {
          throw new Error("No se recibió código de autorización de Discord");
        }

        // Cerrar browser si estamos en mobile
        if (window.Capacitor) {
          try {
            // Verificar si hay una ventana activa antes de intentar cerrar
            const canClose = await Browser.canClose();
            if (canClose) {
              await Browser.close();
            }
          } catch (closeError) {
            console.warn('No se pudo cerrar el browser:', closeError);
          }
        }

        // Intercambiar code por token
        const redirectUri = getDiscordRedirectUri();
        
        const tokenData = await discordService.getAccessToken(code, redirectUri);

        if (!tokenData.access_token) {
          throw new Error("No access token received from Discord");
        }

        // Obtener info del usuario
        const discordUser = await discordService.getUserInfo(tokenData.access_token);

        if (!discordUser.email) {
          throw new Error("No email received from Discord");
        }

        // Login con Strapi
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
        
        const responseText = await authRes.text();
        
        if (!authRes.ok) {
          throw new Error(responseText);
        }

        const authData = JSON.parse(responseText);

        // VERIFICAR SI NECESITA SET PASSWORD
        if (authData.user?.loginMethods !== "both") {
          
          if (window.Capacitor) {
            // Redirigir a la app con información para setPassword
            const appUrl = `malharro://login/setPassword?email=${encodeURIComponent(authData.user.email)}&jwt=${encodeURIComponent(authData.jwt)}&provider=discord`;
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
          if (window.Capacitor) {
            // Redirigir a la app con éxito completo
            const appUrl = `malharro://login/success?jwt=${encodeURIComponent(authData.jwt)}&user=${encodeURIComponent(JSON.stringify(authData.user))}`;
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
        
        if (window.Capacitor) {
          // Redirigir a la app con error
          const errorUrl = `malharro://login?error=${encodeURIComponent(err.message)}`;
          window.location.href = errorUrl;
        } else {
          toast.error("Error en autenticación: " + err.message);
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