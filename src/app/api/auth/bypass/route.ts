import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signAccessToken, signRefreshToken, hashToken, setAuthCookies } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const isGoogleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  // Enforce environment gating: bypass is active ONLY when Google credentials are absent
  if (isGoogleConfigured) {
    return NextResponse.json(
      { error: "Developer bypass is disabled because Google OAuth credentials are configured." },
      { status: 403 }
    );
  }

  try {
    // 1. Find or create the default bypass Tenant (aligned with seed data)
    let tenant = await prisma.tenant.findUnique({
      where: { id: "demo-tenant-id" },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: "demo-tenant-id",
          name: "DareX Corp",
          companyDescription: "DareX Corp builds agentic AI pipelines and custom operations software for high-growth B2B startups.",
          industry: "Enterprise AI Consulting",
          onboardingStatus: "COMPLETED",
        },
      });
    }

    // 2. Find or create the default bypass User linked to the Tenant
    let user = await prisma.user.findUnique({
      where: { email: "sanu@example.com" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: "demo-user-id",
          tenantId: tenant.id,
          name: "Sanu",
          email: "sanu@example.com",
          role: "ADMIN",
        },
      });
    }

    // 3. Issue Refresh Token
    const { token: refreshTokenStr, expiresAt } = await signRefreshToken(user.id);
    const tokenHash = hashToken(refreshTokenStr);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // 4. Issue Access Token
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessTokenStr = await signAccessToken(payload);

    // 5. Write to cookies
    await setAuthCookies(accessTokenStr, refreshTokenStr);

    // 6. Write Audit Log
    await writeAuditLog({
      tenantId: tenant.id,
      actorId: user.id,
      action: "USER_LOGIN_BYPASS",
      targetType: "USER",
      targetId: user.id,
      metadata: { method: "developer_bypass", email: user.email },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Bypass login failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
