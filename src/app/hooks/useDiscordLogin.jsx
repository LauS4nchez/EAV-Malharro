import { API_URL } from "../config";
import { toast } from "react-hot-toast";

export const useDiscordAuth = (setStep, setEmail, setLoading, router) => {
  const discordLogin = () => {
    try {
      setLoading(true);
      
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      const redirectUri = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_PROD
        : process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_DEV;
      
      const scope = 'identify email';
      const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
      
      // Redirigir a Discord OAuth (igual que Google)
      window.location.href = discordAuthUrl;
      
    } catch (error) {
      console.error("Error iniciando Discord OAuth:", error);
      toast.error("Error al conectar con Discord");
      setLoading(false);
    }
  };

  return discordLogin;
};