import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const contactUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  source: z.string().optional(),
});

// GET /api/contacts/[id] - Retrieve details of a single contact
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // In Next.js 15, route params are a promise
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;

    const contact = await prisma.contact.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
      include: {
        opportunities: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/contacts/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/contacts/[id] - Update a contact's details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;
    const body = await request.json();

    // Verify contact belongs to tenant first
    const contact = await prisma.contact.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Validate data
    const validated = contactUpdateSchema.parse(body);

    const updatedContact = await prisma.contact.update({
      where: { id: resolvedParams.id },
      data: {
        name: validated.name !== undefined ? validated.name : undefined,
        phone: validated.phone !== undefined ? validated.phone : undefined,
        email: validated.email !== undefined ? (validated.email || null) : undefined,
        source: validated.source !== undefined ? validated.source : undefined,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "UPDATE_CONTACT",
      targetType: "CONTACT",
      targetId: updatedContact.id,
      metadata: { changed: Object.keys(validated) },
    });

    return NextResponse.json(updatedContact);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PUT /api/contacts/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;

    // Verify contact belongs to tenant first
    const contact = await prisma.contact.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: resolvedParams.id },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "DELETE_CONTACT",
      targetType: "CONTACT",
      targetId: resolvedParams.id,
      metadata: { name: contact.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/contacts/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
