import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

// GET /api/inbox/messages - Retrieve unified inbox timeline for a contact (scoped to tenant)
export async function GET(request: Request) {
  try {
    const session = await enforceAuth();
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    // Security Check: Verify that the contact belongs to the active tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found or access denied" }, { status: 404 });
    }

    // Fetch messages for timeline
    const messages = await prisma.message.findMany({
      where: {
        contactId,
        tenantId: session.tenantId,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/inbox/messages failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
