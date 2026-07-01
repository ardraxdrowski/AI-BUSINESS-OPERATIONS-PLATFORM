import { describe, it, expect } from "vitest";
import { signAccessToken, verifyJWT } from "../src/lib/auth";

describe("Authentication JWT Token Flow", () => {
  const payload = {
    userId: "test-user-id",
    tenantId: "test-tenant-id",
    email: "test@example.com",
    name: "Test User",
    role: "ADMIN",
  };

  it("should successfully sign and verify a token payload", async () => {
    const token = await signAccessToken(payload);
    expect(token).toBeTypeOf("string");

    const decoded = await verifyJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.tenantId).toBe(payload.tenantId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("should return null if verification fails for modified tokens", async () => {
    const token = await signAccessToken(payload);
    const corruptedToken = token + "corrupted";
    
    const decoded = await verifyJWT(corruptedToken);
    expect(decoded).toBeNull();
  });
});
