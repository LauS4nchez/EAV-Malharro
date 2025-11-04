"use client";
import { useEffect } from "react";
import { discordService } from "@/app/services/discordService";
import { API_URL, getDiscordRedirectUri } from "@/app/config";

export default function DiscordCallback() {
  useEffect(() => {
    const run = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (!code) throw new Error("No se recibió código de autorización");

        const redirectUri = getDiscordRedirectUri(); // https://tu-dominio.com/discord/callback

        const tokenData = await discordService.getAccessToken(code, redirectUri);
        const discordUser = await discordService.getUserInfo(tokenData.access_token);

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
        if (!authRes.ok) throw new Error(responseText);
        const authData = JSON.parse(responseText);

        if (authData.user && authData.user.loginMethods && authData.user.loginMethods !== "both") {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "DISCORD_AUTH_NEEDS_PASSWORD",
                email: authData.user.email,
                jwt: authData.jwt,
                userData: authData.user,
              },
              window.location.origin
            );
          }
        } else {
          if (window.opener) {
            window.opener.postMessage(
              { type: "DISCORD_AUTH_SUCCESS", user: authData.user, jwt: authData.jwt },
              window.location.origin
            );
          }
        }

        setTimeout(() => window.close(), 800);
      } catch (error) {
        console.error("Error en callback Discord:", error);
        if (window.opener) {
          window.opener.postMessage(
            { type: "DISCORD_AUTH_ERROR", error: error.message },
            window.location.origin
          );
        }
        setTimeout(() => window.close(), 800);
      }
    };
    run();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando autenticación de Discord…</div>
    </div>
  );
}
