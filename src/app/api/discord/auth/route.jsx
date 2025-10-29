import { NextResponse } from 'next/server';
import { clientIDDiscord, clientSecretDiscord, getDiscordRedirectUri } from '@/app/config';

export async function POST(request) {
  try {
    const { code } = await request.json();
    
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientIDDiscord,
        client_secret: clientSecretDiscord,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: getDiscordRedirectUri(),
        scope: 'identify email',
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}