import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_jwt_secret_must_be_changed_in_production_123456"
);

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}

// Cookie options
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Generate SHA-256 hash of a token
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generate secure random string
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// Sign access token (short-lived, e.g., 15m)
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

// Sign refresh token (long-lived, e.g., 7d)
export async function signRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRandomString(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
  return { token, expiresAt };
}

// Verify JWT
export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Generate code verifier and challenge for PKCE Google OAuth
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

// Rotate refresh token
export async function rotateRefreshToken(oldTokenStr: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: TokenPayload;
} | null> {
  const oldHash = hashToken(oldTokenStr);

  // Find the token in the DB
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash },
    include: { user: { include: { tenant: true } } },
  });

  if (!tokenRecord) {
    return null; // Token doesn't exist
  }

  // Reuse Detection: if token is already revoked or rotated, revoke ALL tokens for this user
  if (tokenRecord.revoked || tokenRecord.rotatedFrom) {
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { revoked: true },
    });
    return null; // Breach detected!
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });
    return null;
  }

  const user = tokenRecord.user;

  // Generate new refresh token
  const { token: newRefreshToken, expiresAt } = await signRefreshToken(user.id);
  const newHash = hashToken(newRefreshToken);

  // Rotate in transaction
  await prisma.$transaction([
    // Mark old token as rotated (we store the ID of the new token in rotatedFrom, or just mark revoked)
    prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    }),
    // Create new token
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt,
        rotatedFrom: tokenRecord.id,
      },
    }),
  ]);

  // Generate new access token
  const payload: TokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  const accessToken = await signAccessToken(payload);

  return { accessToken, refreshToken: newRefreshToken, user: payload };
}

// Set cookies for authentication
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();
  cookieStore.set("auth_access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("auth_refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

// Clear cookies for logout
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set("auth_access_token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
  cookieStore.set("auth_refresh_token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
