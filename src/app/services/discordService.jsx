import { clientIDDiscord, getDiscordRedirectUri } from "@/app/config";

export const discordService = {
  openAuthPopup() {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const url = `https://discord.com/oauth2/authorize?${new URLSearchParams({
      client_id: clientIDDiscord,
      redirect_uri: getDiscordRedirectUri(),
      response_type: "code",
      scope: "identify email",
      state: Math.random().toString(36).substring(7),
    })}`;

    return window.open(
      url,
      "Discord Auth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  },

  async getAccessToken(code, redirectUri) {
    const tokenResponse = await fetch("/api/discord/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Failed to get access token from Discord: ${tokenResponse.status} - ${errorData}`);
    }
    return await tokenResponse.json();
  },

  async getUserInfo(accessToken) {
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info from Discord: ${userResponse.status} - ${errorText}`);
    }
    return await userResponse.json();
  },
};
