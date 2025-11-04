export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const URL = process.env.NEXT_PUBLIC_URL || "https://proyectomalharro.onrender.com";
export const SITE_URL = "https://eav-malharro.onrender.com"; // ← URL de tu página
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export const clientIDGoogle = process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE;
export const clientIDDiscord = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
export const clientSecretDiscord = process.env.DISCORD_CLIENT_SECRET;
export const clientSecretGoogle = process.env.GOOGLE_CLIENT_SECRET

// URLs para Discord
export const discordRedirectUriProd =
  process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_PROD || `${SITE_URL}/auth/callback/discord`;
export const discordRedirectUriDev =
  process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_DEV || "http://localhost:3000/auth/callback/discord";

// URLs para Google (NUEVAS)
export const googleRedirectUriProd =
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI_PROD || `${SITE_URL}/auth/callback/google`;
export const googleRedirectUriDev =
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI_DEV || "http://localhost:3000/auth/callback/google";

export const isNative = () => {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  try {
    if (cap?.isNativePlatform) return !!cap.isNativePlatform();
    if (cap?.getPlatform) {
      const p = cap.getPlatform();
      return p === "android" || p === "ios";
    }
  } catch {}
  return false;
};

export const getDiscordRedirectUri = () => {
  return process.env.NODE_ENV === "production" ? discordRedirectUriProd : discordRedirectUriDev;
};

export const getGoogleRedirectUri = () => {
  if (isNative()) {
    // Para Google en mobile, usa tu dominio web como proxy
    return `${SITE_URL}/auth/callback/google`;
  }
  return process.env.NODE_ENV === "production" 
    ? googleRedirectUriProd 
    : googleRedirectUriDev;
};