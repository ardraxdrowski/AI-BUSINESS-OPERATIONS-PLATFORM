const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Helper to hash refresh tokens
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create a default Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant-id" },
    update: {},
    create: {
      id: "demo-tenant-id",
      name: "DareX Corp",
      industry: "Enterprise AI Consulting",
      companyDescription: "DareX Corp builds agentic AI pipelines and custom operations software for high-growth B2B startups.",
    },
  });
  console.log(`Tenant created/verified: ${tenant.name}`);

  // 2. Create a default Admin User
  const defaultUser = await prisma.user.upsert({
    where: { email: "sanu@example.com" },
    update: {},
    create: {
      id: "demo-user-id",
      tenantId: tenant.id,
      email: "sanu@example.com",
      name: "Sanu",
      role: "ADMIN",
    },
  });
  console.log(`Default User created/verified: ${defaultUser.name} (${defaultUser.email})`);

  // Clear existing items in other tables for fresh seeding
  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.task.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.opportunity.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.message.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.aIMessage.deleteMany({});
  await prisma.aIConversation.deleteMany({ where: { tenantId: tenant.id } });

  // 3. Create Contacts
  const rahul = await prisma.contact.create({
    data: {
      id: "contact-rahul",
      tenantId: tenant.id,
      name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      phone: "+919999999999",
      source: "DIRECT",
    },
  });

  const aditi = await prisma.contact.create({
    data: {
      id: "contact-aditi",
      tenantId: tenant.id,
      name: "Acme Corp (Aditi Verma)",
      email: "aditi.verma@acme.com",
      phone: "+918888888888",
      source: "WEB_LEAD",
    },
  });

  const maya = await prisma.contact.create({
    data: {
      id: "contact-maya",
      tenantId: tenant.id,
      name: "Maya Lin",
      email: "maya.lin@example.com",
      phone: "+15551234567",
      source: "WHATSAPP",
    },
  });
  console.log("Contacts seeded.");

  // 4. Create Opportunities
  const oppAcme = await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: aditi.id,
      title: "Acme Enterprise License",
      value: 45000,
      stage: "PROPOSAL",
      score: 85,
    },
  });

  const oppRahul = await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      contactId: rahul.id,
      title: "Rahul Advisory Sync",
      value: 12000,
      stage: "QUALIFIED",
      score: 65,
    },
  });
  console.log("Opportunities seeded.");

  // 5. Create Unified Messages
  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      contactId: maya.id,
      channel: "whatsapp",
      direction: "inbound",
      content: "Hi Sanu, we reviewed the DareX proposal. The features look great. Can we schedule a quick call tomorrow to clarify the SLA requirements? Budget is around $15k.",
      aiSummary: "Client requested call tomorrow to check SLA; indicated budget around $15k.",
      intent: "meeting_request",
      sentiment: "positive",
      recommendedAction: "Send Zoom calendar link and draft SLA pamphlet",
    },
  });

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      contactId: aditi.id,
      channel: "email",
      direction: "inbound",
      content: "Thank you for sending the quote. We need to present this to our procurement board on Tuesday. The budget seems slightly high.",
      aiSummary: "Acme procurement board review scheduled for Tuesday; raised pricing concerns.",
      intent: "pricing_objection",
      sentiment: "neutral",
      recommendedAction: "Prepare pricing comparison document emphasizing ROI",
    },
  });

  await prisma.message.create({
    data: {
      tenantId: tenant.id,
      contactId: rahul.id,
      channel: "call",
      direction: "outbound",
      content: "Call Log: Discussed advisory contract parameters. Rahul agreed to proceed if we can kick off by mid-month. Needs formal engagement letter.",
      aiSummary: "Discussed kickoff timeline; client agreed to proceed pending formal engagement letter.",
      intent: "general_inquiry",
      sentiment: "positive",
      recommendedAction: "Draft engagement letter and send via email",
    },
  });
  console.log("Unified Inbox touchpoints seeded.");

  // 6. Create Tasks
  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      contactId: aditi.id,
      title: "🔥 Review proposal request with Acme Corp",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      status: "PENDING",
    },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      contactId: maya.id,
      title: "Setup intro sync call with Maya",
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      status: "PENDING",
    },
  });
  console.log("Action Reminders seeded.");

  // 7. Seed initial Audit Log
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: defaultUser.id,
      action: "SEED_DATABASE",
      targetType: "TENANT",
      targetId: tenant.id,
      metadata: { initiatedBy: "system_seeder", date: new Date().toISOString() },
    },
  });
  console.log("Audit log initialized.");

  console.log("🟢 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
