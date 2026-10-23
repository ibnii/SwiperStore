import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it.each([
    ["081234567890", "6281234567890"],
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["(0812) 3456 7890", "6281234567890"],
  ])("menormalisasi %s menjadi %s", (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected);
  });

  it.each(["", "0812", "0812abc", "+1 202 555 0100", "6281234567890123"])(
    "menolak nomor tidak valid: %s",
    (input) => {
      expect(() => normalizeWhatsAppNumber(input)).toThrow();
    },
  );
});

describe("buildWhatsAppMessage", () => {
  it("menghasilkan pesan persis sesuai format", () => {
    expect(buildWhatsAppMessage("SWP-001")).toBe(
      "Halo min, saya ingin membeli akun dengan Id SWP-001",
    );
  });
});

describe("buildWhatsAppUrl", () => {
  it("menghasilkan URL wa.me dengan pesan ter-encode", () => {
    expect(buildWhatsAppUrl("0812-3456-7890", "SWP-001")).toBe(
      "https://wa.me/6281234567890?text=Halo%20min%2C%20saya%20ingin%20membeli%20akun%20dengan%20Id%20SWP-001",
    );
  });

  it("menormalisasi nomor +62 pada URL", () => {
    expect(buildWhatsAppUrl("+62 812 3456 7890", "SWP-002")).toBe(
      "https://wa.me/6281234567890?text=Halo%20min%2C%20saya%20ingin%20membeli%20akun%20dengan%20Id%20SWP-002",
    );
  });
});
