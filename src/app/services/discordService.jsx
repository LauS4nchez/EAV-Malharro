import { API_URL, clientIDDiscord, clientSecretDiscord, getDiscordRedirectUri } from "@/app/config";

export const discordService = {
  // Abrir popup de auth
  openAuthPopup() {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const url = `https://discord.com/oauth2/authorize?${new URLSearchParams({
      client_id: clientIDDiscord,
      redirect_uri: getDiscordRedirectUri(),
      response_type: 'code',
      scope: 'identify email',
      state: Math.random().toString(36).substring(7) // Anti-CSRF
    })}`;
    
    return window.open(url, 'Discord Auth', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  },

  // Intercambiar code por access token (via API route)
  async getAccessToken(code) {
    const tokenResponse = await fetch('/api/discord/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Failed to get access token from Discord: ${tokenResponse.status} - ${errorData.error}`);
    }

    return await tokenResponse.json();
  },

  // Obtener información del usuario de Discord
  async getUserInfo(accessToken) {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info from Discord: ${userResponse.status} - ${errorText}`);
    }

    return await userResponse.json();
  },

  // Procesar login/registro con Discord en tu backend
  async handleDiscordAuth(discordUserData) {
    const { id: discordId, email, username, global_name, avatar } = discordUserData;

    const authRes = await fetch(`${API_URL}/discord-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        discordId, 
        username: global_name || username,
        discordUsername: username,
        avatar: avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png` : null
      }),
    });

    const responseText = await authRes.text();
    
    if (!authRes.ok) {
      throw new Error(responseText);
    }

    return JSON.parse(responseText);
  }
};