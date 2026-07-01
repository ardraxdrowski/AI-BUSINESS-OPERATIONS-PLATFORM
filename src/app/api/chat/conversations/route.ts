import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

// GET /api/chat/conversations - List all conversations for the tenant and user
export async function GET() {
  try {
    const session = await enforceAuth();

    const conversations = await prisma.aIConversation.findMany({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/chat/conversations failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
