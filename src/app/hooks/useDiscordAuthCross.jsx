"use client";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { API_URL, clientIDDiscord, getDiscordRedirectUri } from "@/app/config";

export const useDiscordAuthCross = ({ setStep, setEmail, setLoading, router }) => {
  const webLogin = async () => {
    try {
      setLoading(true);
      const { discordService } = await import("@/app/services/discordService");
      const popup = discordService.openAuthPopup();
      if (!popup || popup.closed) throw new Error("Popup bloqueado");
      // El resto se maneja por el listener en tu DiscordCallback (web)
    } catch (e) {
      console.error(e);
      toast.error("Habilita los popups para continuar con Discord");
      setLoading(false);
    }
  };

  const nativeLogin = async () => {
    const redirectUri = getDiscordRedirectUri(); // ej: malharro://auth/discord
    const state = Math.random().toString(36).slice(2);

    const authUrl = `https://discord.com/oauth2/authorize?${new URLSearchParams({
      client_id: clientIDDiscord,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
    })}`;

    let sub;
    try {
      setLoading(true);

      sub = await App.addListener("appUrlOpen", async (event) => {
        try {
          const url = event.url || "";
          if (!url.startsWith(redirectUri)) return;

          await Browser.close();

          const u = new URL(url);
          const code = u.searchParams.get("code");
          const stateBack = u.searchParams.get("state");
          if (!code || stateBack !== state) throw new Error("Código o state inválidos");

          const tokenResponse = await fetch("/api/discord/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, redirectUri }),
          });
          if (!tokenResponse.ok) {
            const errT = await tokenResponse.text();
            throw new Error(`Discord token exchange falló: ${errT}`);
          }
          const tokenData = await tokenResponse.json();

          const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const discordUser = await userResponse.json();

          const appAuth = await fetch(`${API_URL}/discord-auth/login`, {
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

          const responseText = await appAuth.text();
          if (!appAuth.ok) throw new Error(responseText);
          const authData = JSON.parse(responseText);

          if (authData.user?.loginMethods !== "both") {
            setEmail(authData.user.email);
            setStep("setPassword");
            toast("Configura tu usuario y contraseña para poder iniciar sesión manualmente.");
          } else {
            localStorage.setItem("jwt", authData.jwt);
            localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
            toast.success(`¡Bienvenido ${authData.user?.username}!`);
            router.push("/");
          }
        } catch (e) {
          console.error(e);
          toast.error("Error en autenticación con Discord (app)");
        } finally {
          setLoading(false);
          if (sub) sub.remove();
        }
      });

      await Browser.open({ url: authUrl, windowName: "discord" });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo abrir Discord");
      setLoading(false);
      if (sub) sub.remove();
    }
  };

  return () => (Capacitor.isNativePlatform() ? nativeLogin() : webLogin());
};
