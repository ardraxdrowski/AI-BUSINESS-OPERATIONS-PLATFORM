import { NextResponse } from "next/server";
import { enforceAuth } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolExecutors } from "@/lib/ai/tools";
import { z } from "zod";

const leadQualifySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  companySize: z.number().nonnegative().default(1),
  budget: z.number().nonnegative().default(0),
  notes: z.string().optional().default(""),
});

// GET qualification score using Gemini or fallback heuristics
async function evaluateLeadScore(
  budget: number,
  companySize: number,
  notes: string,
  tenantDescription?: string
): Promise<{ score: number; reason: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `
Evaluate this inbound B2B sales lead and assign a qualification score from 0 to 100.
Budget and purchase urgency are the most critical factors.
Lead parameters:
- Budget (USD): $${budget}
- Company Size: ${companySize} employee(s)
- Notes: "${notes}"

Business Context: "${tenantDescription || 'B2B platform operations'}"

Produce a JSON output with exactly:
- score: An integer score from 0 to 100.
- reason: A concise reason for this evaluation.
`;

      const response = await model.generateContent(prompt);
      const resText = response.response.text();
      const parsed = JSON.parse(resText);
      return {
        score: Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
        reason: parsed.reason || "AI evaluated profile criteria.",
      };
    } catch (err) {
      console.error("AI Lead scoring failed, falling back to heuristics:", err);
    }
  }

  // Fallback heuristics
  let score = 30; // base score
  let reason = "Evaluated via local heuristics. ";

  if (budget >= 20000) {
    score += 40;
    reason += "High budget (+$20k). ";
  } else if (budget >= 5000) {
    score += 20;
    reason += "Medium budget (+$5k). ";
  } else {
    reason += "Low budget. ";
  }

  if (companySize >= 100) {
    score += 20;
    reason += "Enterprise size company (100+). ";
  } else if (companySize >= 15) {
    score += 10;
    reason += "Mid-size company. ";
  }

  const notesLower = notes.toLowerCase();
  if (notesLower.includes("urgent") || notesLower.includes("immediate") || notesLower.includes("ready to buy") || notesLower.includes("now")) {
    score += 20;
    reason += "High purchase urgency notes. ";
  }

  score = Math.min(100, score);
  return { score, reason };
}

// POST /api/automation/qualify - Lead qualification automation pipeline
export async function POST(request: Request) {
  try {
    const session = await enforceAuth();
    const body = await request.json();

    const validated = leadQualifySchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
    });

    const executionLog: string[] = [];

    // Step 1: Ingest Lead -> Create Contact
    const contact = await prisma.contact.create({
      data: {
        tenantId: session.tenantId,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        source: "INBOUND_LEAD",
      },
    });
    executionLog.push(`[1/5] Ingested Contact: '${validated.name}'`);
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "LEAD_AUTO_INGEST",
      targetType: "CONTACT",
      targetId: contact.id,
      metadata: { name: contact.name, email: contact.email },
    });

    // Step 2: Score lead
    const evaluation = await evaluateLeadScore(
      validated.budget,
      validated.companySize,
      validated.notes,
      tenant?.companyDescription || ""
    );
    executionLog.push(`[2/5] Evaluated Lead: Score ${evaluation.score}/100. Reason: ${evaluation.reason}`);
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "LEAD_EVALUATE_SCORE",
      targetType: "CONTACT",
      targetId: contact.id,
      metadata: { score: evaluation.score, reason: evaluation.reason },
    });

    // Step 3: Create Opportunity linked to contact
    const opportunity = await prisma.opportunity.create({
      data: {
        tenantId: session.tenantId,
        contactId: contact.id,
        title: `Lead Qual: ${contact.name}`,
        value: validated.budget,
        stage: "LEAD",
        score: evaluation.score,
      },
    });
    executionLog.push(`[3/5] Created Opportunity: '${opportunity.title}' valued at $${validated.budget}`);
    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "LEAD_AUTO_OPPORTUNITY",
      targetType: "OPPORTUNITY",
      targetId: opportunity.id,
      metadata: { title: opportunity.title, score: evaluation.score },
    });

    // Step 4: Conditional Actions based on Score > 80
    const isHighQuality = evaluation.score > 80;
    
    if (isHighQuality) {
      executionLog.push(`[4/5] Score ${evaluation.score} exceeds threshold (>80). Triggering High-Priority Alerts.`);
      
      // WhatsApp alert dispatch
      const alertMsg = `🔥 High-quality lead ingested! Name: ${contact.name}, Budget: $${validated.budget}, AI Score: ${evaluation.score}/100. Action recommended: Review proposal request immediately.`;
      
      await toolExecutors.send_whatsapp(session.tenantId, session.userId, {
        contactId: contact.id,
        content: alertMsg,
      });
      executionLog.push(`[5/5] Outbound WhatsApp alert dispatched to client/sales dashboard.`);

      // Create priority followup task due tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = await prisma.task.create({
        data: {
          tenantId: session.tenantId,
          contactId: contact.id,
          title: `🔥 IMMEDIATE: Call high-score lead ${contact.name}`,
          dueAt: tomorrow,
          status: "PENDING",
        },
      });
      executionLog.push(`[SYSTEM] Scheduled High-Priority followup task for tomorrow.`);
      
      await writeAuditLog({
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "LEAD_HIGH_QUALITY_TRIGGER",
        targetType: "TASK",
        targetId: task.id,
        metadata: { contactName: contact.name, score: evaluation.score },
      });
    } else {
      executionLog.push(`[4/5] Score ${evaluation.score} is below priority threshold (<=80). Nurturing standard workflow.`);
      
      // Create standard task due in 3 days
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const task = await prisma.task.create({
        data: {
          tenantId: session.tenantId,
          contactId: contact.id,
          title: `Nurture follow-up: ${contact.name}`,
          dueAt: threeDaysLater,
          status: "PENDING",
        },
      });
      executionLog.push(`[5/5] Scheduled standard follow-up task in 3 days.`);
      
      await writeAuditLog({
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "LEAD_STANDARD_TRIGGER",
        targetType: "TASK",
        targetId: task.id,
        metadata: { contactName: contact.name, score: evaluation.score },
      });
    }

    return NextResponse.json({
      success: true,
      contact,
      opportunity,
      score: evaluation.score,
      reason: evaluation.reason,
      log: executionLog,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/automation/qualify failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
