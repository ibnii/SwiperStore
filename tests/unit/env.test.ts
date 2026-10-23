import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";

const validSource: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://swiperstore:swiperstore_dev@localhost:5433/swiperstore",
  ADMIN_EMAIL: "admin@swiperstore.local",
  ADMIN_PASSWORD_HASH: "dev-placeholder-hash",
  WA_NUMBER: "081234567890",
  UPLOAD_DIR: "./storage/uploads",
  SITE_URL: "http://localhost:3000",
};

const requiredKeys = [
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD_HASH",
  "WA_NUMBER",
  "UPLOAD_DIR",
  "SITE_URL",
] as const;

describe("parseEnv", () => {
  it("menerima env lengkap dan menormalisasi WA_NUMBER", () => {
    const env = parseEnv(validSource);

    expect(env.DATABASE_URL).toBe(validSource.DATABASE_URL);
    expect(env.ADMIN_EMAIL).toBe("admin@swiperstore.local");
    expect(env.WA_NUMBER).toBe("6281234567890");
    expect(env.SITE_URL).toBe("http://localhost:3000");
  });

  it.each(requiredKeys)("menolak env wajib yang hilang: %s", (key) => {
    const source = { ...validSource };
    delete source[key];

    expect(() => parseEnv(source)).toThrow();
  });

  it("menolak email admin yang tidak valid", () => {
    expect(() =>
      parseEnv({ ...validSource, ADMIN_EMAIL: "bukan-email" }),
    ).toThrow();
  });

  it.each(["", "0812", "0812abc", "+1 202 555 0100"])(
    "menolak nomor WhatsApp yang tidak valid: %s",
    (waNumber) => {
      expect(() => parseEnv({ ...validSource, WA_NUMBER: waNumber })).toThrow();
    },
  );

  it("menolak DATABASE_URL yang bukan PostgreSQL", () => {
    expect(() =>
      parseEnv({
        ...validSource,
        DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      }),
    ).toThrow();
  });

  it("menolak UPLOAD_DIR kosong", () => {
    expect(() => parseEnv({ ...validSource, UPLOAD_DIR: "" })).toThrow();
  });

  it("menolak SITE_URL yang tidak valid", () => {
    expect(() =>
      parseEnv({ ...validSource, SITE_URL: "bukan-url" }),
    ).toThrow();
  });
});

describe("modul env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("gagal saat diimpor jika env runtime tidak valid", async () => {
    vi.resetModules();
    vi.stubEnv("SITE_URL", "bukan-url");

    await expect(import("@/lib/env")).rejects.toThrow();
  });
});
