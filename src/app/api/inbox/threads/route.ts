import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

// GET /api/inbox/threads - Fetch all contact threads for sidebar with their latest messages (scoped to tenant)
export async function GET() {
  try {
    const session = await enforceAuth();

    const threads = await prisma.contact.findMany({
      where: { tenantId: session.tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the most recent message for preview
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(threads);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/inbox/threads failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
