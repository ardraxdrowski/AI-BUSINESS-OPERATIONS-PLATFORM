import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

// GET /api/chat/messages - Retrieve message list for a specific conversation with security isolation check
export async function GET(request: Request) {
  try {
    const session = await enforceAuth();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Security Check: Verify that the conversation belongs to the active tenant
    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: session.tenantId, // Tenant Isolation checked
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 });
    }

    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/chat/messages failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
