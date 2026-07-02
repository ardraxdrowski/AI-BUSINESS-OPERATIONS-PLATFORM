import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeAuditLog } from "@/lib/audit";

// AI analysis helper for incoming messages
export async function analyzeIncomingMessage(content: string, tenantDescription?: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  // --- Case A: Live Gemini Key Present ---
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `
Analyze the following incoming customer message. Produce a JSON object with exactly these fields:
- intent: Short string representing customer's primary objective (e.g., "pricing_objection", "meeting_request", "product_inquiry", "general_greetings").
- sentiment: Exactly "positive", "neutral", or "negative".
- aiSummary: A one-sentence summary of the customer's message.
- recommendedAction: A clear, actionable recommended next step for the business employee (e.g., "Draft pricing proposal", "Send calendar link").

Customer Message: "${content}"
Business Profile Context: "${tenantDescription || 'Business operations platform'}"

JSON Output:
`;

      const response = await model.generateContent(prompt);
      const resText = response.response.text();
      const parsed = JSON.parse(resText);
      return {
        intent: parsed.intent || "general_inquiry",
        sentiment: parsed.sentiment || "neutral",
        aiSummary: parsed.aiSummary || "Incoming customer message.",
        recommendedAction: parsed.recommendedAction || "Review message and reply",
      };
    } catch (err) {
      console.error("Gemini webhook analysis failed, falling back to heuristics:", err);
    }
  }

  // --- Case B: Heuristics Fallback ---
  const textLower = content.toLowerCase();
  let intent = "general_inquiry";
  let sentiment = "neutral";
  let aiSummary = `Client sent a message: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`;
  let recommendedAction = "Acknowledge message and schedule follow-up";

  if (textLower.includes("price") || textLower.includes("cost") || textLower.includes("how much") || textLower.includes("quote")) {
    intent = "pricing_objection";
    recommendedAction = "Send standard Q4 pricing proposal and follow up in 24h";
  } else if (textLower.includes("meet") || textLower.includes("call") || textLower.includes("schedule") || textLower.includes("zoom") || textLower.includes("tomorrow")) {
    intent = "meeting_request";
    sentiment = "positive";
    recommendedAction = "Coordinate team calendar and send a Zoom invite";
  } else if (textLower.includes("angry") || textLower.includes("bad") || textLower.includes("disappointed") || textLower.includes("cancel") || textLower.includes("error")) {
    intent = "support_complaint";
    sentiment = "negative";
    recommendedAction = "Escalate to admin and draft urgent phone resolution plan";
  } else if (textLower.includes("thank") || textLower.includes("great") || textLower.includes("awesome") || textLower.includes("love")) {
    intent = "positive_feedback";
    sentiment = "positive";
    recommendedAction = "Send thank you note and request referral";
  }

  return { intent, sentiment, aiSummary, recommendedAction };
}

// GET /api/webhooks/whatsapp - WhatsApp webhook verification (hub challenge)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "darex_whatsapp_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WEBHOOK] WhatsApp endpoint verified successfully.");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WEBHOOK] WhatsApp verification failed. Invalid verify token.");
  return new Response("Forbidden", { status: 403 });
}

// POST /api/webhooks/whatsapp - Incoming message ingestion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[WEBHOOK] WhatsApp message received payload:", JSON.stringify(body));

    // Extract message fields
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const val = change?.value;
    const msg = val?.messages?.[0];

    if (!msg || msg.type !== "text") {
      // Ignore non-text or status update hooks
      return NextResponse.json({ success: true, ignored: true });
    }

    const from = msg.from; // Phone number
    const content = msg.text?.body;
    const senderName = val?.contacts?.[0]?.profile?.name || "WhatsApp Client";

    // 1. Look up contact by phone number globally to identify tenant
    let contact = await prisma.contact.findFirst({
      where: { phone: from },
      include: { tenant: true },
    });

    let tenantId: string;

    if (contact) {
      tenantId = contact.tenantId;
    } else {
      // Resolve to default tenant
      const defaultTenant = await prisma.tenant.findFirst();
      if (!defaultTenant) {
        return NextResponse.json({ error: "No tenants configured." }, { status: 500 });
      }
      tenantId = defaultTenant.id;

      // Auto-create new contact lead!
      contact = await prisma.contact.create({
        data: {
          tenantId,
          name: senderName,
          phone: from,
          source: "WHATSAPP",
        },
        include: { tenant: true },
      });
    }

    // 2. Perform AI analysis on the message content
    const analysis = await analyzeIncomingMessage(content, contact.tenant?.companyDescription || "");

    // 3. Save message to unified inbox database
    const message = await prisma.message.create({
      data: {
        tenantId,
        contactId: contact.id,
        channel: "whatsapp",
        direction: "inbound",
        content,
        aiSummary: analysis.aiSummary,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        recommendedAction: analysis.recommendedAction,
      },
    });

    // 4. Audit Log
    await writeAuditLog({
      tenantId,
      actorId: null, // System-initiated
      action: "INGEST_WHATSAPP_MESSAGE",
      targetType: "MESSAGE",
      targetId: message.id,
      metadata: { contactName: contact.name, intent: analysis.intent, sentiment: analysis.sentiment },
    });

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("WhatsApp webhook processing failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
