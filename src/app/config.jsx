// config.js
export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const URL = process.env.NEXT_PUBLIC_URL || "https://proyectomalharro.onrender.com";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export const clientIDGoogle = process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE;
export const clientIDDiscord = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

export const clientSecretDiscord = process.env.DISCORD_CLIENT_SECRET;

export const discordRedirectUriProd =
  process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_PROD || `${URL}/discord/callback`;
export const discordRedirectUriDev =
  process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_DEV || "http://localhost:3000/discord/callback";

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
  if (isNative()) return "malharro://auth/discord"; // ← debe matchear tu AndroidManifest
  return process.env.NODE_ENV === "production" ? discordRedirectUriProd : discordRedirectUriDev;
};
