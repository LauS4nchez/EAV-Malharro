import { NextResponse } from "next/server";

import { clientIDDiscord, clientSecretDiscord } from "@/app/config";

export async function POST(request) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code || !redirectUri) {
      return NextResponse.json({ error: "Missing code or redirectUri" }, { status: 400 });
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientIDDiscord,
        client_secret: clientSecretDiscord,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: "identify email",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: `Discord API error: ${tokenResponse.status} - ${errorText}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
