import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { adminSessions } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "swiper_admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type AdminSession = {
  id: string;
  expiresAt: Date;
};

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeIp(ip: string | null): string | null {
  return ip && isIP(ip) !== 0 ? ip : null;
}

export async function createAdminSession(meta: {
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(adminSessions).values({
    tokenHash: hashSessionToken(token),
    expiresAt,
    ip: normalizeIp(meta.ip),
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: expiresAt,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token || !TOKEN_PATTERN.test(token)) {
    return null;
  }

  const [row] = await db
    .select({ id: adminSessions.id, expiresAt: adminSessions.expiresAt })
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.tokenHash, hashSessionToken(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, hashSessionToken(token)));
  }

  store.delete({ name: SESSION_COOKIE_NAME, path: "/admin" });
}
