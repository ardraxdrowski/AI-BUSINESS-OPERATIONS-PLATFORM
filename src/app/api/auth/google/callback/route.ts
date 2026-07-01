import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db";
import { signAccessToken, signRefreshToken, hashToken, setAuthCookies, COOKIE_OPTIONS } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_jwt_secret_must_be_changed_in_production_123456"
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("oauth_code_verifier")?.value;

  // Clear PKCE cookies immediately for security
  cookieStore.set("oauth_state", "", { ...COOKIE_OPTIONS, maxAge: 0 });
  cookieStore.set("oauth_code_verifier", "", { ...COOKIE_OPTIONS, maxAge: 0 });

  if (!code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=invalid_oauth_state", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch user profile from Google info endpoint
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=profile_fetch_failed", request.url));
    }

    const profile = await profileResponse.json();
    const { sub: googleId, email, name } = profile;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=email_missing_from_profile", request.url));
    }

    // 3. Search for existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
    });

    if (user) {
      // User already exists. Make sure googleId is linked if it wasn't
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }

      // Issue tokens
      const { token: refreshTokenStr, expiresAt } = await signRefreshToken(user.id);
      const tokenHash = hashToken(refreshTokenStr);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const accessTokenStr = await signAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      await setAuthCookies(accessTokenStr, refreshTokenStr);

      // Audit Log
      await writeAuditLog({
        tenantId: user.tenantId,
        actorId: user.id,
        action: "USER_LOGIN_GOOGLE",
        targetType: "USER",
        targetId: user.id,
        metadata: { email: user.email },
      });

      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      // New signup: User does not exist, redirect to onboarding flow
      // Generate temporary signup token signed with JWT_SECRET
      const signupToken = await new SignJWT({ email, name, googleId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30m")
        .sign(JWT_SECRET);

      cookieStore.set("auth_signup_token", signupToken, {
        ...COOKIE_OPTIONS,
        maxAge: 1800, // 30 minutes
      });

      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  } catch (error) {
    console.error("Google authentication callback error:", error);
    return NextResponse.redirect(new URL("/login?error=callback_error", request.url));
  }
}
