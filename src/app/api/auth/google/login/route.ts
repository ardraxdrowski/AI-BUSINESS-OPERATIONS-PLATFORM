import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { generatePKCE, COOKIE_OPTIONS } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Please use Developer Bypass login." },
      { status: 501 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomUUID();

  // Determine redirect URI dynamically
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Set PKCE cookies
  const cookieStore = await cookies();
  cookieStore.set("oauth_code_verifier", codeVerifier, {
    ...COOKIE_OPTIONS,
    maxAge: 300, // 5 minutes
  });
  cookieStore.set("oauth_state", state, {
    ...COOKIE_OPTIONS,
    maxAge: 300, // 5 minutes
  });

  // Redirect to Google OAuth consent page
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("scope", "openid profile email");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("code_challenge", codeChallenge);
  googleAuthUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(googleAuthUrl.toString());
}
