import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const redirectTo = searchParams.get("redirect");
  
  const cookieStore = await cookies();
  const oldRefreshToken = cookieStore.get("auth_refresh_token")?.value;

  if (!oldRefreshToken) {
    await clearAuthCookies();
    if (redirectTo) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectTo)}`, request.url));
    }
    return NextResponse.json({ error: "Refresh token missing" }, { status: 401 });
  }

  try {
    const rotationResult = await rotateRefreshToken(oldRefreshToken);

    if (!rotationResult) {
      // Rotation failed (compromised token or expired session)
      await clearAuthCookies();
      if (redirectTo) {
        return NextResponse.redirect(new URL("/login?error=session_expired", request.url));
      }
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { accessToken, refreshToken } = rotationResult;
    await setAuthCookies(accessToken, refreshToken);

    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Token rotation failed:", error);
    await clearAuthCookies();
    if (redirectTo) {
      return NextResponse.redirect(new URL("/login?error=server_error", request.url));
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Support POST requests as well for client-side API interceptors
export async function POST() {
  const cookieStore = await cookies();
  const oldRefreshToken = cookieStore.get("auth_refresh_token")?.value;

  if (!oldRefreshToken) {
    await clearAuthCookies();
    return NextResponse.json({ error: "Refresh token missing" }, { status: 401 });
  }

  try {
    const rotationResult = await rotateRefreshToken(oldRefreshToken);

    if (!rotationResult) {
      await clearAuthCookies();
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { accessToken, refreshToken, user } = rotationResult;
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Token rotation failed via POST:", error);
    await clearAuthCookies();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
