import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const opportunitySchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  title: z.string().min(1, "Title is required"),
  value: z.number().nonnegative("Value must be a positive number"),
  stage: z.string().min(1, "Stage is required"),
  score: z.number().int().min(0).max(100).optional().nullable(),
});

// GET /api/opportunities - Retrieve all opportunities for active tenant
export async function GET() {
  try {
    const session = await enforceAuth();

    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId: session.tenantId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(opportunities);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/opportunities failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/opportunities - Create a new opportunity
export async function POST(request: Request) {
  try {
    const session = await enforceAuth();
    const body = await request.json();

    // Validate body
    const validated = opportunitySchema.parse(body);

    // Security check: Verify the contact belongs to the active tenant
    const contact = await prisma.contact.findFirst({
      where: {
        id: validated.contactId,
        tenantId: session.tenantId, // Tenant isolation checked
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Invalid Contact: Contact not found under this tenant." },
        { status: 400 }
      );
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        tenantId: session.tenantId,
        contactId: validated.contactId,
        title: validated.title,
        value: validated.value,
        stage: validated.stage,
        score: validated.score || null,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "CREATE_OPPORTUNITY",
      targetType: "OPPORTUNITY",
      targetId: opportunity.id,
      metadata: { title: opportunity.title, value: opportunity.value, stage: opportunity.stage },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/opportunities failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
