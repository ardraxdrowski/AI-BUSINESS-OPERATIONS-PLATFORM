import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { signAccessToken, signRefreshToken, hashToken, setAuthCookies, COOKIE_OPTIONS } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_jwt_secret_must_be_changed_in_production_123456"
);

interface SignupPayload {
  email: string;
  name: string;
  googleId: string;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const signupToken = cookieStore.get("auth_signup_token")?.value;

  if (!signupToken) {
    return NextResponse.json(
      { error: "Onboarding session expired or invalid. Please log in again." },
      { status: 401 }
    );
  }

  try {
    // 1. Verify signup token
    const { payload } = await jwtVerify(signupToken, JWT_SECRET);
    const { email, name, googleId } = payload as unknown as SignupPayload;

    // 2. Parse request body
    const body = await request.json();
    const { companyName, industry, companyDescription } = body;

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    // 3. Create Tenant and Admin User inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists (just in case)
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error("User already onboarded.");
      }

      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          industry: industry || "Other",
          companyDescription: companyDescription || "",
          onboardingStatus: "COMPLETED",
        },
      });

      // Create Admin User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          googleId,
          email,
          name,
          role: "ADMIN",
        },
      });

      return { tenant, user };
    });

    const { tenant, user } = result;

    // 4. Issue auth tokens
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

    // 5. Update cookies (add auth cookies, clear signup cookie)
    await setAuthCookies(accessTokenStr, refreshTokenStr);
    cookieStore.set("auth_signup_token", "", { ...COOKIE_OPTIONS, maxAge: 0 });

    // 6. Write Audit Log
    await writeAuditLog({
      tenantId: tenant.id,
      actorId: user.id,
      action: "TENANT_ONBOARD",
      targetType: "TENANT",
      targetId: tenant.id,
      metadata: { companyName, industry, email: user.email },
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
    console.error("Onboarding failed:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// Add a GET endpoint to check onboarding state / signup token presence
export async function GET() {
  const cookieStore = await cookies();
  const signupToken = cookieStore.get("auth_signup_token")?.value;

  if (!signupToken) {
    return NextResponse.json({ active: false });
  }

  try {
    const { payload } = await jwtVerify(signupToken, JWT_SECRET);
    return NextResponse.json({
      active: true,
      profile: {
        name: payload.name,
        email: payload.email,
      },
    });
  } catch (error) {
    return NextResponse.json({ active: false });
  }
}
