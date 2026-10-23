import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession, type AdminSession } from "./session";

/**
 * Server-side security boundary for admin actions and layouts. A layout-only
 * guard would not protect Server Actions invoked directly.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
