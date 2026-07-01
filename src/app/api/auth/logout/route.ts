import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashToken, clearAuthCookies } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const refreshTokenStr = cookieStore.get("auth_refresh_token")?.value;

  if (refreshTokenStr) {
    try {
      const tokenHash = hashToken(refreshTokenStr);
      // Revoke this specific refresh token in the database
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    } catch (error) {
      console.error("Failed to revoke refresh token during logout:", error);
    }
  }

  // Clear HTTP-only cookies
  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
