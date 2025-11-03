"use client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { discordService } from "@/app/services/discordService";

export const useDiscordAuth = (setStep, setEmail, setLoading, router) => {
  const discordLoginWeb = () => {
    setLoading(true);
    const popup = discordService.openAuthPopup();

    if (!popup || popup.closed) {
      toast.error("Por favor permite popups para este sitio");
      setLoading(false);
      return;
    }

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "DISCORD_AUTH_SUCCESS") {
        const { user, jwt } = event.data;
        localStorage.setItem("jwt", jwt);
        localStorage.setItem("userRole", user.role?.name || "Authenticated");
        toast.success(`¡Bienvenido ${user.username}!`);
        router.push("/");
        window.removeEventListener("message", handleMessage);
        setLoading(false);
      }

      if (event.data.type === "DISCORD_AUTH_NEEDS_PASSWORD") {
        const { email, jwt, userData } = event.data;
        setEmail(email);
        setStep("setPassword");
        localStorage.setItem(
          "pendingDiscordAuth",
          JSON.stringify({
            email,
            jwt,
            userData,
            provider: "discord",
          })
        );
        toast.success("Configura tu usuario y contraseña");
        window.removeEventListener("message", handleMessage);
        setLoading(false);
      }

      if (event.data.type === "DISCORD_AUTH_ERROR") {
        console.error("Error en auth Discord:", event.data.error);
        toast.error("Error al autenticar con Discord");
        window.removeEventListener("message", handleMessage);
        setLoading(false);
      }
    };

    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        window.removeEventListener("message", handleMessage);
        setLoading(false);
      }
    }, 500);

    window.addEventListener("message", handleMessage);

    setTimeout(() => {
      clearInterval(checkPopup);
      window.removeEventListener("message", handleMessage);
      if (!popup.closed) {
        popup.close();
        setLoading(false);
      }
    }, 5 * 60 * 1000);
  };

  const discordLoginNative = async () => {
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/discord-auth/start`;
      await Browser.open({ url: loginUrl });
    } catch (err) {
      console.error("Error al abrir login Discord:", err);
      toast.error("No se pudo abrir el inicio de sesión con Discord.");
    }
  };

  return () => {
    if (Capacitor.isNativePlatform()) {
      discordLoginNative();
    } else {
      discordLoginWeb();
    }
  };
};
