import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { analyzeIncomingMessage } from "@/app/api/webhooks/whatsapp/route";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const simulationSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  channel: z.enum(["whatsapp", "email", "call"]),
  direction: z.enum(["inbound", "outbound"]),
  content: z.string().min(1, "Message content is required"),
});

// POST /api/inbox/simulate - Simulate message ingestion for unified inbox testing/demoing
export async function POST(request: Request) {
  try {
    const session = await enforceAuth();
    const body = await request.json();

    const validated = simulationSchema.parse(body);

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: validated.contactId,
        tenantId: session.tenantId, // Tenant Isolation
      },
      include: { tenant: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found or access denied" }, { status: 404 });
    }

    // Run AI analysis pipeline (just like real WhatsApp ingestion!)
    // For outbound calls, we can analyze the call log notes or text transcription
    const analysis = await analyzeIncomingMessage(
      validated.content,
      contact.tenant?.companyDescription || ""
    );

    // Create the message in database
    const message = await prisma.message.create({
      data: {
        tenantId: session.tenantId,
        contactId: validated.contactId,
        channel: validated.channel,
        direction: validated.direction,
        content: validated.content,
        aiSummary: analysis.aiSummary,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        recommendedAction: analysis.recommendedAction,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: `SIMULATE_INBOX_${validated.channel.toUpperCase()}`,
      targetType: "MESSAGE",
      targetId: message.id,
      metadata: {
        contactName: contact.name,
        direction: validated.direction,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/inbox/simulate failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
