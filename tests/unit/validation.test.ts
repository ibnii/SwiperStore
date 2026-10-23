import { describe, expect, it } from "vitest";
import { listingInputSchema } from "@/lib/listings/validation";

const validInput = {
  title: "Akun PUBG M416 Glacier",
  description:
    "Akun PUBG Mobile dengan skin M416 Glacier dan rank Conqueror.",
  priceIdr: 1_500_000,
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  isSold: false,
};

describe("listingInputSchema", () => {
  it("accepts a valid listing and trims text fields", () => {
    const result = listingInputSchema.parse({
      ...validInput,
      title: "  Akun M416  ",
      description: `  ${validInput.description}  `,
      videoUrl: `  ${validInput.videoUrl}  `,
    });

    expect(result).toEqual({
      ...validInput,
      title: "Akun M416",
    });
  });

  it("accepts the maximum price boundary", () => {
    expect(() =>
      listingInputSchema.parse({ ...validInput, priceIdr: 1_000_000_000 }),
    ).not.toThrow();
  });

  it.each([
    ["two characters", "ab"],
    ["101 characters", "a".repeat(101)],
    ["only spaces", "   "],
  ])("rejects a title with %s", (_label, title) => {
    expect(() => listingInputSchema.parse({ ...validInput, title })).toThrow();
  });

  it.each([
    ["nine characters", "a".repeat(9)],
    ["5001 characters", "a".repeat(5001)],
  ])("rejects a description with %s", (_label, description) => {
    expect(() =>
      listingInputSchema.parse({ ...validInput, description }),
    ).toThrow();
  });

  it.each([0, -1, 1.5, 1_000_000_001])(
    "rejects an invalid price (%s)",
    (priceIdr) => {
      expect(() =>
        listingInputSchema.parse({ ...validInput, priceIdr }),
      ).toThrow();
    },
  );

  it.each([
    ["unsupported host", "https://example.com/video"],
    ["http YouTube", "http://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["TikTok short link", "https://vm.tiktok.com/ZMabcdefg/"],
  ])("rejects a video URL with %s", (_label, videoUrl) => {
    expect(() =>
      listingInputSchema.parse({ ...validInput, videoUrl }),
    ).toThrow();
  });

  it("rejects a missing status", () => {
    const withoutStatus: Record<string, unknown> = { ...validInput };
    delete withoutStatus.isSold;

    expect(() => listingInputSchema.parse(withoutStatus)).toThrow();
  });

  it("rejects a non-boolean status", () => {
    expect(() =>
      listingInputSchema.parse({ ...validInput, isSold: "false" }),
    ).toThrow();
  });
});
