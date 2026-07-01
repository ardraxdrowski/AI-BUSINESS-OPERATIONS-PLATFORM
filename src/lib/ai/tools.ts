import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

// Defined tool schemas for Gemini function calling
export const aiToolsDeclarations = [
  {
    name: "search_contacts",
    description: "Find a contact/customer by name, email, or phone number inside the tenant workspace.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The query string representing name, email, or phone to search for.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_task",
    description: "Create a follow-up action or task reminder associated with a contact.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: {
          type: "STRING",
          description: "Clear summary of the task to be performed.",
        },
        dueAt: {
          type: "STRING",
          description: "The due date in YYYY-MM-DD format.",
        },
        contactId: {
          type: "STRING",
          description: "The ID of the contact to link the task to.",
        },
      },
      required: ["title", "dueAt", "contactId"],
    },
  },
  {
    name: "update_opportunity",
    description: "Update the sales stage, deal value, or AI lead score of an existing opportunity.",
    parameters: {
      type: "OBJECT",
      properties: {
        opportunityId: {
          type: "STRING",
          description: "The ID of the opportunity to update.",
        },
        stage: {
          type: "STRING",
          description: "The next stage for the deal (LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST).",
        },
        value: {
          type: "NUMBER",
          description: "The current monetary value of the deal.",
        },
        score: {
          type: "NUMBER",
          description: "The lead qualification score (0-100).",
        },
      },
      required: ["opportunityId"],
    },
  },
  {
    name: "send_whatsapp",
    description: "Send a WhatsApp follow-up or outbound message to a contact.",
    parameters: {
      type: "OBJECT",
      properties: {
        contactId: {
          type: "STRING",
          description: "The ID of the contact to message.",
        },
        content: {
          type: "STRING",
          description: "The text content of the message.",
        },
      },
      required: ["contactId", "content"],
    },
  },
  {
    name: "fetch_business_metrics",
    description: "Retrieve active dashboard metrics (pipeline revenue, won revenue, deals count, tasks count).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

// Tool Executors. Fully tenant-isolated.
export const toolExecutors: Record<string, (tenantId: string, userId: string, args: any) => Promise<any>> = {
  search_contacts: async (tenantId, userId, { query }) => {
    console.log(`[AI TOOL] search_contacts running for tenant ${tenantId}: "${query}"`);
    const contacts = await prisma.contact.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
    });
    return {
      contacts,
      explanation: `I searched contacts for '${query}' and found ${contacts.length} match(es).`,
    };
  },

  create_task: async (tenantId, userId, { title, dueAt, contactId }) => {
    console.log(`[AI TOOL] create_task running for tenant ${tenantId}: "${title}"`);
    
    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });
    if (!contact) {
      return { error: "Contact not found in this tenant." };
    }

    const task = await prisma.task.create({
      data: {
        tenantId,
        contactId,
        title,
        dueAt: new Date(dueAt),
        status: "PENDING",
      },
    });

    await writeAuditLog({
      tenantId,
      actorId: userId,
      action: "AI_CREATE_TASK",
      targetType: "TASK",
      targetId: task.id,
      metadata: { title, dueAt, contactName: contact.name },
    });

    return {
      task,
      explanation: `I scheduled a follow-up task titled '${title}' for ${contact.name} due on ${new Date(dueAt).toLocaleDateString()}.`,
    };
  },

  update_opportunity: async (tenantId, userId, { opportunityId, stage, value, score }) => {
    console.log(`[AI TOOL] update_opportunity running: id ${opportunityId}`);

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, tenantId },
      include: { contact: true },
    });

    if (!opportunity) {
      return { error: "Opportunity not found in this tenant." };
    }

    const updated = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        stage: stage !== undefined ? stage : undefined,
        value: value !== undefined ? value : undefined,
        score: score !== undefined ? score : undefined,
      },
    });

    await writeAuditLog({
      tenantId,
      actorId: userId,
      action: "AI_UPDATE_OPPORTUNITY",
      targetType: "OPPORTUNITY",
      targetId: updated.id,
      metadata: { changed: { stage, value, score }, title: updated.title },
    });

    let explanationDetail = `I updated opportunity '${updated.title}'`;
    if (stage) explanationDetail += ` stage to '${stage}'`;
    if (value) explanationDetail += ` value to $${value}`;
    if (score) explanationDetail += ` qualification score to ${score}`;

    return {
      opportunity: updated,
      explanation: `${explanationDetail} for client ${opportunity.contact.name}.`,
    };
  },

  send_whatsapp: async (tenantId, userId, { contactId, content }) => {
    console.log(`[AI TOOL] send_whatsapp running: contact ${contactId}`);

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });

    if (!contact) {
      return { error: "Contact not found in this tenant." };
    }

    // WhatsApp Meta Integration (Env-Gated)
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const isLive = !!(phoneNumberId && accessToken && contact.phone);
    let status = "SENT";

    if (isLive) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "text",
              text: { body: content },
            }),
          }
        );
        if (!response.ok) {
          const errBody = await response.text();
          console.error("Live WhatsApp dispatch failed:", errBody);
          status = "FAILED";
        }
      } catch (err) {
        console.error("Live WhatsApp error:", err);
        status = "FAILED";
      }
    }

    // Save outbound message to unified inbox
    const message = await prisma.message.create({
      data: {
        tenantId,
        contactId,
        channel: "whatsapp",
        direction: "outbound",
        content,
        intent: "outbound_follow_up",
        sentiment: "neutral",
        aiSummary: "AI-generated outbound reminder",
        recommendedAction: "Await contact response",
      },
    });

    await writeAuditLog({
      tenantId,
      actorId: userId,
      action: "AI_SEND_WHATSAPP",
      targetType: "MESSAGE",
      targetId: message.id,
      metadata: { contactName: contact.name, mode: isLive ? "live" : "mocked", status },
    });

    return {
      message,
      explanation: `I ${isLive ? "sent a live" : "mock-sent a simulated"} WhatsApp message to ${contact.name}: "${content.substring(0, 40)}..."`,
    };
  },

  fetch_business_metrics: async (tenantId, userId) => {
    console.log(`[AI TOOL] fetch_business_metrics running for tenant ${tenantId}`);

    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId },
    });

    const activeStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
    const active = opportunities.filter((o) => activeStages.includes(o.stage.toUpperCase()));
    const pipeline = active.reduce((sum, o) => sum + o.value, 0);
    const won = opportunities
      .filter((o) => o.stage.toUpperCase() === "WON")
      .reduce((sum, o) => sum + o.value, 0);

    const pendingTasks = await prisma.task.count({
      where: { tenantId, status: "PENDING" },
    });

    return {
      metrics: {
        activeOpportunities: active.length,
        revenuePipeline: pipeline,
        wonRevenue: won,
        pendingTasks,
      },
      explanation: `I pulled the active CRM metrics. Your pipeline stands at $${pipeline.toLocaleString()} across ${active.length} active deals, with $${won.toLocaleString()} won revenue, and ${pendingTasks} pending task(s) remaining.`,
    };
  },
};
