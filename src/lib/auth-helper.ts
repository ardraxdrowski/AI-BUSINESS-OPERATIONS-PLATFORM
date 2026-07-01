import { headers } from "next/headers";

export interface AuthSession {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

/**
 * Retrieve user auth session injected by the middleware.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const tenantId = headersList.get("x-tenant-id");
  const role = headersList.get("x-user-role");
  const email = headersList.get("x-user-email");

  if (!userId || !tenantId) {
    return null;
  }

  return {
    userId,
    tenantId,
    role: role || "USER",
    email: email || "",
  };
}

/**
 * Enforce authentication and return the session details.
 * Throws an error if the request is not authenticated.
 */
export async function enforceAuth(): Promise<AuthSession> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
