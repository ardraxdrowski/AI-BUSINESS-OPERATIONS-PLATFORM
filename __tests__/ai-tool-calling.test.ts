import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiToolsDeclarations, toolExecutors } from "../src/lib/ai/tools";
import { prisma } from "../src/lib/db";

// Mock the prisma database client
vi.mock("../src/lib/db", () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    opportunity: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      create: vi.fn(),
      count: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Conversational AI Agent Tools & Function Declarations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have all 5 required tools defined in Gemini schema declarations", () => {
    const requiredTools = ["search_contacts", "create_task", "update_opportunity", "send_whatsapp", "fetch_business_metrics"];
    const declaredNames = aiToolsDeclarations.map((t) => t.name);

    requiredTools.forEach((toolName) => {
      expect(declaredNames).toContain(toolName);
    });
  });

  it("should enforce tenant isolation inside search_contacts executor", async () => {
    const mockContacts = [{ id: "contact-1", name: "Rahul Sharma", email: "rahul@example.com", phone: "+919999999999" }];
    vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts as any);

    const result = await toolExecutors.search_contacts("tenant-A", "user-123", { query: "Rahul" });

    // Assert database call filters strictly by tenant ID
    expect(prisma.contact.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-A",
        OR: [
          { name: { contains: "Rahul" } },
          { email: { contains: "Rahul" } },
          { phone: { contains: "Rahul" } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
    });

    // Assert explainability output is present
    expect(result.explanation).toBeTypeOf("string");
    expect(result.explanation).toContain("Rahul");
    expect(result.contacts).toEqual(mockContacts);
  });
});
