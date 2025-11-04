import { isNative, getGoogleRedirectUri } from "@/app/config";

export const googleService = {
  async openAuthPopup() {
    if (isNative()) {
      // Para apps nativas
      const redirectUri = getGoogleRedirectUri();
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'email profile',
        state: Math.random().toString(36).substring(7),
      })}`;

      if (window.Capacitor && window.Capacitor.Plugins?.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url });
      } else {
        window.open(url, '_system');
      }
      return null;
    } else {
      // Para web
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE,
        redirect_uri: getGoogleRedirectUri(),
        response_type: 'code',
        scope: 'email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: Math.random().toString(36).substring(7),
      })}`;

      return window.open(
        url,
        "Google Auth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    }
  },

  async getAccessToken(code, redirectUri) {
    const tokenResponse = await fetch("/api/google/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Failed to get access token from Google: ${tokenResponse.status} - ${errorData}`);
    }
    return await tokenResponse.json();
  },

  async getUserInfo(accessToken) {
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info from Google: ${userResponse.status} - ${errorText}`);
    }
    return await userResponse.json();
  },
};