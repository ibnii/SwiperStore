"use server";

import { isIP } from "node:net";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { authenticateAdmin, normalizeAdminEmail } from "@/lib/auth/password";
import {
  LOGIN_RATE_LIMIT_WINDOW_MS,
  loginEmailLimiter,
  loginIpLimiter,
} from "@/lib/auth/rate-limit";
import { createAdminSession } from "@/lib/auth/session";

export type LoginState = { error: string } | undefined;

const GENERIC_ERROR = "Email atau password salah.";
const RATE_LIMIT_ERROR = `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(
  LOGIN_RATE_LIMIT_WINDOW_MS / 60_000,
)} menit.`;

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

function getClientIp(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "";

  return isIP(candidate) !== 0 ? candidate : null;
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const email = normalizeAdminEmail(parsed.data.email);
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const ipKey = `ip:${ip ?? "unknown"}`;
  const emailKey = `email:${email}`;

  if (
    loginIpLimiter.check(ipKey).limited ||
    loginEmailLimiter.check(emailKey).limited
  ) {
    return { error: RATE_LIMIT_ERROR };
  }

  const authenticated = await authenticateAdmin(
    { email, password: parsed.data.password },
    { email: env.ADMIN_EMAIL, passwordHash: env.ADMIN_PASSWORD_HASH },
  );

  if (!authenticated) {
    loginIpLimiter.recordFailure(ipKey);
    loginEmailLimiter.recordFailure(emailKey);
    return { error: GENERIC_ERROR };
  }

  loginIpLimiter.reset(ipKey);
  loginEmailLimiter.reset(emailKey);

  await createAdminSession({
    ip,
    userAgent: requestHeaders.get("user-agent"),
  });

  // Always go to /admin; never accept a user-supplied redirect target.
  redirect("/admin");
}
