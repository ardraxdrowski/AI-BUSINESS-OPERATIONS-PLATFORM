import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const opportunityUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  value: z.number().nonnegative("Value must be a positive number").optional(),
  stage: z.string().min(1, "Stage is required").optional(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  contactId: z.string().min(1, "Contact is required").optional(),
});

// GET /api/opportunities/[id] - Retrieve a single opportunity's details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
      include: {
        contact: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json(opportunity);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/opportunities/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/opportunities/[id] - Update an opportunity
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;
    const body = await request.json();

    // Verify opportunity belongs to tenant
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Validate update parameters
    const validated = opportunityUpdateSchema.parse(body);

    // If contactId is being updated, verify it belongs to the active tenant
    if (validated.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: validated.contactId,
          tenantId: session.tenantId,
        },
      });

      if (!contact) {
        return NextResponse.json(
          { error: "Invalid Contact: Contact not found under this tenant." },
          { status: 400 }
        );
      }
    }

    const updatedOpportunity = await prisma.opportunity.update({
      where: { id: resolvedParams.id },
      data: {
        title: validated.title !== undefined ? validated.title : undefined,
        value: validated.value !== undefined ? validated.value : undefined,
        stage: validated.stage !== undefined ? validated.stage : undefined,
        score: validated.score !== undefined ? validated.score : undefined,
        contactId: validated.contactId !== undefined ? validated.contactId : undefined,
      },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "UPDATE_OPPORTUNITY",
      targetType: "OPPORTUNITY",
      targetId: updatedOpportunity.id,
      metadata: { changed: Object.keys(validated), title: updatedOpportunity.title, stage: updatedOpportunity.stage },
    });

    return NextResponse.json(updatedOpportunity);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PUT /api/opportunities/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;

    // Verify opportunity belongs to tenant
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId: session.tenantId, // Tenant Isolation Enforced
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    await prisma.opportunity.delete({
      where: { id: resolvedParams.id },
    });

    // Write Audit Log
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "DELETE_OPPORTUNITY",
      targetType: "OPPORTUNITY",
      targetId: resolvedParams.id,
      metadata: { title: opportunity.title },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/opportunities/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
