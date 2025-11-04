import { NextResponse } from "next/server";
import { clientIDGoogle, clientSecretGoogle } from "@/app/config";

export async function POST(request) {
  try {
    const { code, redirectUri } = await request.json();

    console.log('🔧 Google token exchange - code:', code ? 'RECIBIDO' : 'NO RECIBIDO');
    console.log('🔧 Google token exchange - redirectUri:', redirectUri);

    if (!code || !redirectUri) {
      console.error('❌ Missing code or redirectUri');
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
    console.log('🔧 Google token response status:', tokenResponse.status);
    console.log('🔧 Google token response:', responseText);

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: `Google API error: ${tokenResponse.status} - ${responseText}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = JSON.parse(responseText);
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('❌ Google token exchange error:', error);
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 });
  }
}