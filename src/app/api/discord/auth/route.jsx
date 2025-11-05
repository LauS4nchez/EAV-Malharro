import { NextResponse } from "next/server";
import { clientIDDiscord, clientSecretDiscord } from "@/app/config";

export async function POST(request) {
  try {
    const { code, redirectUri } = await request.json();

    console.log('=== DEBUG DISCORD AUTH ===');
    console.log('Code recibido:', code ? 'SÍ' : 'NO');
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', clientIDDiscord ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('Client Secret:', clientSecretDiscord ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('========================');

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

    const responseText = await tokenResponse.text();
    console.log('Discord token response status:', tokenResponse.status);
    console.log('Discord token response:', responseText);

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: `Discord API error: ${tokenResponse.status} - ${responseText}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = JSON.parse(responseText);
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Discord token exchange error:', error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  }
}