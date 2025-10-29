export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const URL = process.env.NEXT_PUBLIC_URL;
export const clientIDGoogle = process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE;
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
export const clientIDDiscord = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
export const clientSecretDiscord = process.env.DISCORD_CLIENT_SECRET;
export const discordRedirectUriProd = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_PROD;
export const discordRedirectUriDev = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI_DEV;

// Helper para obtener la redirect URI según el entorno
export const getDiscordRedirectUri = () => {
  return process.env.NODE_ENV === 'production' ? discordRedirectUriProd : discordRedirectUriDev;
};