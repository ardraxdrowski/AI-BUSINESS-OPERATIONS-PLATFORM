import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_jwt_secret_must_be_changed_in_production_123456"
);

// List of public paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/google/login",
  "/api/auth/google/callback",
  "/api/auth/bypass",
  "/api/auth/refresh",
  "/api/webhooks/whatsapp",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if current path is public
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // Retrieve tokens from cookies
  const accessToken = request.cookies.get("auth_access_token")?.value;
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;

  // Clone headers to safely modify them
  const requestHeaders = new Headers(request.headers);

  // Prevent header spoofing by deleting any client-provided x-user or x-tenant headers
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-email");

  if (isPublic) {
    return NextResponse.next({
      headers: requestHeaders,
    });
  }

  // If no tokens at all, redirect to login (or return 401 for API)
  if (!accessToken && !refreshToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Case 1: Access token exists, verify it
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, JWT_SECRET);
      
      // Inject user and tenant details as headers for downstream routes
      requestHeaders.set("x-user-id", payload.userId as string);
      requestHeaders.set("x-tenant-id", payload.tenantId as string);
      requestHeaders.set("x-user-role", payload.role as string);
      requestHeaders.set("x-user-email", payload.email as string);

      // If the user is authenticated and goes to dashboard/chat, check onboarding
      // (For this simplified demo, we handle onboarding redirections in pages or just allow access)
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (err) {
      // Access token is invalid/expired. Proceed to refresh flow.
    }
  }

  // Case 2: Access token expired/missing, but refresh token exists
  // Redirect to refresh route to attempt silent token rotation
  if (refreshToken) {
    if (pathname.startsWith("/api/")) {
      // For API routes, return 401 and let client call refresh explicitly
      return NextResponse.json({ error: "Access token expired" }, { status: 401 });
    }

    // For page requests, redirect to refresh endpoint with target redirect URL
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    refreshUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(refreshUrl);
  }

  // Fallback redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

// Config to specify which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
