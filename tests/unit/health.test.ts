import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/lib/db/client", () => ({ db: { execute } }));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("returns 200 when the database answers", async () => {
    execute.mockResolvedValueOnce([{ ok: 1 }]);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns 503 when the database is unreachable", async () => {
    execute.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "error" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
