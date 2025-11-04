// En src/app/api/google/auth/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { code, redirectUri } = await request.json();
    const clientIDGoogle = process.env.NEXT_PUBLIC_CLIENT_ID_GOOGLE;
    const clientSecretGoogle = process.env.GOOGLE_CLIENT_SECRET;

    console.log('=== DEBUG GOOGLE AUTH ===');
    console.log('Code recibido:', code ? 'SÍ (' + code.substring(0, 20) + '...)' : 'NO');
    console.log('Client ID:', clientIDGoogle ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('Client Secret:', clientSecretGoogle ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('Redirect URI:', redirectUri);
    console.log('========================');

    if (!code || !redirectUri) {
      return NextResponse.json({ error: "Missing code or redirectUri" }, { status: 400 });
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientIDGoogle,
        client_secret: clientSecretGoogle,
        code: code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const responseText = await tokenResponse.text();
    console.log('Google token response status:', tokenResponse.status);
    console.log('Google token response:', responseText);

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: `Google API error: ${tokenResponse.status} - ${responseText}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = JSON.parse(responseText);
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Google token exchange error:', error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  }
}