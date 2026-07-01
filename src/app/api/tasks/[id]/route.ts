import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  dueAt: z.string().optional(),
  status: z.string().min(1).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;
    const body = await request.json();

    const task = await prisma.task.findFirst({
      where: { id: resolvedParams.id, tenantId: session.tenantId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const validated = taskUpdateSchema.parse(body);

    const updatedTask = await prisma.task.update({
      where: { id: resolvedParams.id },
      data: {
        title: validated.title !== undefined ? validated.title : undefined,
        dueAt: validated.dueAt !== undefined ? new Date(validated.dueAt) : undefined,
        status: validated.status !== undefined ? validated.status : undefined,
      },
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "UPDATE_TASK",
      targetType: "TASK",
      targetId: updatedTask.id,
      metadata: { changed: Object.keys(validated), title: updatedTask.title, status: updatedTask.status },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PUT /api/tasks/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await enforceAuth();
    const resolvedParams = await params;

    const task = await prisma.task.findFirst({
      where: { id: resolvedParams.id, tenantId: session.tenantId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: resolvedParams.id },
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "DELETE_TASK",
      targetType: "TASK",
      targetId: resolvedParams.id,
      metadata: { title: task.title },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/tasks/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
