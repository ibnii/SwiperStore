import { describe, expect, it } from "vitest";
import { formatIDR } from "@/lib/format";

describe("formatIDR", () => {
  it("formats rupiah with Indonesian thousands separators", () => {
    expect(formatIDR(1_250_000)).toBe("Rp1.250.000");
  });

  it("formats zero and small amounts without separators", () => {
    expect(formatIDR(0)).toBe("Rp0");
    expect(formatIDR(999)).toBe("Rp999");
  });

  it("formats the maximum allowed listing price", () => {
    expect(formatIDR(1_000_000_000)).toBe("Rp1.000.000.000");
  });

  it("rounds fractional input to a whole rupiah amount", () => {
    expect(formatIDR(1_500.6)).toBe("Rp1.501");
  });
});
