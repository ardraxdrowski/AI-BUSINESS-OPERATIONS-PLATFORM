import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  dueAt: z.string().min(1, "Due date is required"),
  contactId: z.string().optional().nullable(),
});

// GET /api/tasks - Retrieve all tasks for the active tenant
export async function GET() {
  try {
    const session = await enforceAuth();

    const tasks = await prisma.task.findMany({
      where: { tenantId: session.tenantId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { dueAt: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tasks failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/tasks - Create a task
export async function POST(request: Request) {
  try {
    const session = await enforceAuth();
    const body = await request.json();

    const validated = taskSchema.parse(body);

    // If contactId is set, verify it belongs to tenant
    if (validated.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: validated.contactId, tenantId: session.tenantId },
      });
      if (!contact) {
        return NextResponse.json({ error: "Contact not found under tenant" }, { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: {
        tenantId: session.tenantId,
        contactId: validated.contactId || null,
        title: validated.title,
        dueAt: new Date(validated.dueAt),
        status: "PENDING",
      },
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "CREATE_TASK",
      targetType: "TASK",
      targetId: task.id,
      metadata: { title: task.title, dueAt: task.dueAt },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/tasks failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
