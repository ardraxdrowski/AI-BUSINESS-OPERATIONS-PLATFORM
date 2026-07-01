import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await enforceAuth();
    const tenantId = session.tenantId;

    // 1. Fetch opportunities for calculations
    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId },
      include: { contact: true },
    });

    const activeStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
    
    // Active Opportunities: count of open deals
    const activeOpportunities = opportunities.filter((o) =>
      activeStages.includes(o.stage.toUpperCase())
    );

    // Revenue Pipeline: sum of active opportunity values
    const revenuePipeline = activeOpportunities.reduce((sum, o) => sum + o.value, 0);

    // Won/Closed deals for comparison
    const closedWon = opportunities.filter((o) => o.stage.toUpperCase() === "WON");
    const wonRevenue = closedWon.reduce((sum, o) => sum + o.value, 0);

    // 2. Pending Tasks (Follow-ups) count
    const pendingTasksCount = await prisma.task.count({
      where: {
        tenantId,
        status: "PENDING",
      },
    });

    // 3. Customer Activity / Recent audit logs for feed
    const recentActivity = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 4. Calculate derived AI Alerts
    const aiAlerts: Array<{ id: string; type: string; title: string; description: string; confidence?: number; actionText?: string; actionPath?: string }> = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Alert Category A: Deals stuck for more than 7 days
    const stuckOpportunities = activeOpportunities.filter(
      (o) => new Date(o.updatedAt) < sevenDaysAgo
    );
    stuckOpportunities.forEach((o) => {
      aiAlerts.push({
        id: `stuck-deal-${o.id}`,
        type: "stuck_deal",
        title: `Deal stuck: ${o.title}`,
        description: `This opportunity valued at $${o.value.toLocaleString()} has been stuck in the '${o.stage}' stage for over 7 days.`,
        confidence: 94,
        actionText: "Review Deal",
        actionPath: `/opportunities/${o.id}`,
      });
    });

    // Alert Category B: Contacts with no recent messages or communication (7+ days)
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    contacts.forEach((c) => {
      const lastMessage = c.messages[0];
      const lastContactDate = lastMessage ? new Date(lastMessage.createdAt) : new Date(c.createdAt);

      if (lastContactDate < sevenDaysAgo) {
        aiAlerts.push({
          id: `no-contact-${c.id}`,
          type: "no_contact",
          title: `Ghosted Contact: ${c.name}`,
          description: `No communication recorded with ${c.name} in over 7 days. Last touchpoint was ${lastContactDate.toLocaleDateString()}.`,
          confidence: 88,
          actionText: "Send follow-up",
          actionPath: `/chat?contactId=${c.id}`,
        });
      }
    });

    // Alert Category C: Opportunities with no follow-up task scheduled
    for (const o of activeOpportunities) {
      const taskCount = await prisma.task.count({
        where: {
          tenantId,
          contactId: o.contactId,
          status: "PENDING",
        },
      });

      if (taskCount === 0) {
        aiAlerts.push({
          id: `no-task-${o.id}`,
          type: "missing_task",
          title: "Missing follow-up plan",
          description: `Opportunity '${o.title}' (${o.contact.name}) has no active pending follow-up task scheduled.`,
          confidence: 82,
          actionText: "Schedule Task",
          actionPath: `/opportunities/${o.id}`,
        });
      }
    }

    return NextResponse.json({
      activeOpportunitiesCount: activeOpportunities.length,
      revenuePipeline,
      wonRevenue,
      pendingTasksCount,
      recentActivity,
      aiAlerts: aiAlerts.slice(0, 5), // return top 5 derived alerts
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/dashboard/metrics failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
