import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_ADMIN_PASSWORD = "test-admin-password";
const TEST_ADMIN_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$F9cXXPxjOb6fcX7cNWjJKw$PL9a0aOiLet6adp2iVSu2tzlC3YjP4HT052m1bHpj6I";

const { testState, redirectMock } = vi.hoisted(() => {
  const jar = new Map<string, string>();

  return {
    testState: {
      jar,
      cookieSets: [] as Array<{
        name: string;
        value: string;
        options: Record<string, unknown>;
      }>,
      cookieDeletes: [] as unknown[],
      ip: "203.0.113.10",
      userAgent: "vitest-auth",
    },
    redirectMock: vi.fn((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & {
        digest?: string;
      };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }),
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      testState.jar.has(name)
        ? { name, value: testState.jar.get(name)! }
        : undefined,
    set: (name: string, value: string, options: Record<string, unknown>) => {
      testState.jar.set(name, value);
      testState.cookieSets.push({ name, value, options });
    },
    delete: (arg: string | { name: string }) => {
      const name = typeof arg === "string" ? arg : arg.name;
      testState.jar.delete(name);
      testState.cookieDeletes.push(arg);
    },
  }),
  headers: async () =>
    new Headers({
      "x-forwarded-for": testState.ip,
      "user-agent": testState.userAgent,
    }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { login } from "@/app/admin/login/actions";
import {
  authenticateAdmin,
  hashPassword,
  normalizeAdminEmail,
  verifyPassword,
} from "@/lib/auth/password";
import {
  createRateLimiter,
  loginEmailLimiter,
  loginIpLimiter,
} from "@/lib/auth/rate-limit";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createAdminSession,
  destroyAdminSession,
  getAdminSession,
  hashSessionToken,
} from "@/lib/auth/session";
import { db, pool } from "@/lib/db/client";
import { adminSessions } from "@/lib/db/schema";

type VerifyFn = (password: string, hash: string) => Promise<boolean>;

let ipCounter = 10;

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE admin_sessions");
  testState.jar.clear();
  testState.cookieSets.length = 0;
  testState.cookieDeletes.length = 0;
  testState.ip = `203.0.113.${ipCounter++}`;
  testState.userAgent = "vitest-auth";
  loginIpLimiter.reset();
  loginEmailLimiter.reset();
  redirectMock.mockClear();
});

afterAll(async () => {
  await pool.end();
});

describe("session token hashing", () => {
  it("hashes a token deterministically with SHA-256", () => {
    const first = hashSessionToken("token-satu");
    const second = hashSessionToken("token-satu");
    const other = hashSessionToken("token-dua");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(other);
  });
});

describe("createAdminSession", () => {
  it("stores only the hash and sets a hardened cookie", async () => {
    await createAdminSession({
      ip: "203.0.113.7",
      userAgent: "vitest-create",
    });

    expect(testState.cookieSets).toHaveLength(1);
    const [cookie] = testState.cookieSets;

    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookie.options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/admin",
      }),
    );
    expect(cookie.options.expires).toBeInstanceOf(Date);

    const rows = await db.select().from(adminSessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashSessionToken(cookie.value));
    expect(rows[0].tokenHash).not.toBe(cookie.value);
    expect(rows[0].ip).toBe("203.0.113.7");
    expect(rows[0].userAgent).toBe("vitest-create");
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(
      Date.now() + SESSION_TTL_MS - 5_000,
    );
  });
});

describe("getAdminSession", () => {
  it("returns null without a cookie", async () => {
    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("returns the session for a valid cookie", async () => {
    await createAdminSession({ ip: null, userAgent: null });
    const token = testState.jar.get(SESSION_COOKIE_NAME)!;

    const session = await getAdminSession();
    const [row] = await db.select().from(adminSessions);

    expect(session).toEqual({ id: row.id, expiresAt: row.expiresAt });
    expect(session?.expiresAt).toEqual(row.expiresAt);
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown token", async () => {
    testState.jar.set(SESSION_COOKIE_NAME, "token-tidak-dikenal");
    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("returns null for an expired session", async () => {
    const token = "token-kedaluwarsa";
    testState.jar.set(SESSION_COOKIE_NAME, token);

    await db.insert(adminSessions).values({
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(getAdminSession()).resolves.toBeNull();
  });
});

describe("destroyAdminSession", () => {
  it("deletes the database row and the cookie", async () => {
    await createAdminSession({ ip: null, userAgent: null });
    await destroyAdminSession();

    const rows = await db.select().from(adminSessions);

    expect(rows).toEqual([]);
    expect(testState.jar.has(SESSION_COOKIE_NAME)).toBe(false);
    expect(testState.cookieDeletes).toEqual([
      expect.objectContaining({ name: SESSION_COOKIE_NAME, path: "/admin" }),
    ]);
  });
});

describe("requireAdmin", () => {
  it("redirects to the login page without a valid session", async () => {
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });

  it("returns the session when authenticated", async () => {
    await createAdminSession({ ip: null, userAgent: null });

    const session = await requireAdmin();

    expect(session.id).toEqual(expect.any(String));
    expect(session.expiresAt).toBeInstanceOf(Date);
  });
});

describe("rate limiter", () => {
  it("blocks the sixth attempt after five failures", () => {
    const now = 1_000_000;
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      now: () => now,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.check("ip:test").limited).toBe(false);
      limiter.recordFailure("ip:test");
    }

    expect(limiter.check("ip:test")).toEqual({
      limited: true,
      retryAfterMs: 60_000,
    });
    expect(limiter.check("ip:other").limited).toBe(false);
  });

  it("allows attempts again after the window expires", () => {
    let now = 5_000;
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      now: () => now,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.recordFailure("email:test");
    }

    expect(limiter.check("email:test").limited).toBe(true);

    now += 60_000;

    expect(limiter.check("email:test")).toEqual({
      limited: false,
      retryAfterMs: 0,
    });
  });

  it("resets a key after a successful login", () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

    limiter.recordFailure("ip:test");
    limiter.reset("ip:test");

    expect(limiter.check("ip:test").limited).toBe(false);
  });
});

describe("password helpers", () => {
  it("hashes with Argon2id and verifies the password", async () => {
    const hash = await hashPassword("rahasia-admin");

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword("rahasia-admin", hash)).resolves.toBe(true);
    await expect(verifyPassword("salah", hash)).resolves.toBe(false);
  });

  it("returns false instead of throwing for a malformed hash", async () => {
    await expect(verifyPassword("apa saja", "bukan-hash")).resolves.toBe(false);
  });

  it("normalizes email addresses", () => {
    expect(normalizeAdminEmail("  Admin@SwiperStore.Local ")).toBe(
      "admin@swiperstore.local",
    );
  });

  it("verifies against a dummy hash when the email does not match", async () => {
    const realHash = TEST_ADMIN_PASSWORD_HASH;
    const verify = vi.fn<VerifyFn>(async () => false);

    const result = await authenticateAdmin(
      { email: "orang-lain@example.com", password: "apa-saja" },
      { email: "admin@swiperstore.local", passwordHash: realHash },
      verify,
    );

    expect(result).toBe(false);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith("apa-saja", expect.any(String));
    const usedHash = verify.mock.calls[0][1];
    expect(usedHash).not.toBe(realHash);
    expect(usedHash).toMatch(/^\$argon2id\$/);
  });

  it("verifies against the real hash when the email matches", async () => {
    const verify = vi.fn<VerifyFn>(async () => true);

    const result = await authenticateAdmin(
      { email: " Admin@SwiperStore.Local ", password: "benar" },
      { email: "admin@swiperstore.local", passwordHash: TEST_ADMIN_PASSWORD_HASH },
      verify,
    );

    expect(result).toBe(true);
    expect(verify).toHaveBeenCalledWith(
      "benar",
      TEST_ADMIN_PASSWORD_HASH,
    );
  });

  it("rejects a matching email with the wrong password", async () => {
    const result = await authenticateAdmin(
      { email: "admin@swiperstore.local", password: "salah" },
      { email: "admin@swiperstore.local", passwordHash: TEST_ADMIN_PASSWORD_HASH },
      vi.fn(async () => false),
    );

    expect(result).toBe(false);
  });
});

function loginForm(email: string, password: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

describe("login action", () => {
  it("creates a session and redirects after valid credentials", async () => {
    await expect(
      login(
        undefined,
        loginForm(process.env.ADMIN_EMAIL!, TEST_ADMIN_PASSWORD),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/admin");

    expect(redirectMock).toHaveBeenCalledWith("/admin");
    expect(testState.jar.has(SESSION_COOKIE_NAME)).toBe(true);

    const rows = await db.select().from(adminSessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(
      hashSessionToken(testState.jar.get(SESSION_COOKIE_NAME)!),
    );
  });

  it("returns a generic error for a wrong password", async () => {
    const state = await login(
      undefined,
      loginForm(process.env.ADMIN_EMAIL!, "password-salah"),
    );

    expect(state).toEqual({ error: "Email atau password salah." });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(testState.jar.has(SESSION_COOKIE_NAME)).toBe(false);
  });

  it("blocks the sixth failed attempt from the same IP", async () => {
    const email = process.env.ADMIN_EMAIL!;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const state = await login(undefined, loginForm(email, "password-salah"));
      expect(state).toEqual({ error: "Email atau password salah." });
    }

    const blocked = await login(undefined, loginForm(email, "password-salah"));

    expect(blocked?.error).toContain("Terlalu banyak percobaan");
  });

  it("blocks further attempts for the same email across IPs", async () => {
    const email = process.env.ADMIN_EMAIL!;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      testState.ip = `198.51.100.${attempt + 1}`;
      const state = await login(undefined, loginForm(email, "password-salah"));
      expect(state).toEqual({ error: "Email atau password salah." });
    }

    testState.ip = "198.51.100.200";
    const blocked = await login(undefined, loginForm(email, "password-salah"));

    expect(blocked?.error).toContain("Terlalu banyak percobaan");
  });
});
