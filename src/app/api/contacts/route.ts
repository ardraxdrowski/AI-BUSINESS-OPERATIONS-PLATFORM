import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  source: z.string().default("DIRECT"),
});

// GET /api/contacts - Retrieve all contacts for the active tenant
export async function GET() {
  try {
    const session = await enforceAuth();

    const contacts = await prisma.contact.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/contacts failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact scoped to the active tenant
export async function POST(request: Request) {
  try {
    const session = await enforceAuth();
    const body = await request.json();

    // Parse and validate body
    const validated = contactSchema.parse(body);

    const contact = await prisma.contact.create({
      data: {
        tenantId: session.tenantId,
        name: validated.name,
        phone: validated.phone || null,
        email: validated.email || null,
        source: validated.source,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "CREATE_CONTACT",
      targetType: "CONTACT",
      targetId: contact.id,
      metadata: { name: contact.name, source: contact.source },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/contacts failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
