import { describe, expect, it } from "vitest";
import { findExpiredTrash, findOrphanedMedia } from "@/lib/media/cleanup";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);

function media(relativePath: string, mtimeMs = NOW) {
  return { absolutePath: `/srv/storage/${relativePath}`, relativePath, mtimeMs };
}

describe("findOrphanedMedia", () => {
  it("keeps files referenced by listings and returns the rest", () => {
    const files = [
      media("listings/2026/10/used.webp"),
      media("listings/2026/10/orphan.webp"),
      media("listings/seed/akun-01.webp"),
    ];

    const orphans = findOrphanedMedia(files, [
      "/media/listings/2026/10/used.webp",
      "/media/listings/seed/akun-01.webp",
    ]);

    expect(orphans.map((file) => file.relativePath)).toEqual([
      "listings/2026/10/orphan.webp",
    ]);
  });

  it("does not treat a prefix match as a reference", () => {
    const files = [media("listings/2026/10/used.webp")];

    const orphans = findOrphanedMedia(files, [
      "/media/listings/2026/10/used",
    ]);

    expect(orphans).toHaveLength(1);
  });
});

describe("findExpiredTrash", () => {
  it("returns files older than the retention window", () => {
    const files = [
      media("trash/listings/old.webp", NOW - 8 * DAY_MS),
      media("trash/listings/boundary.webp", NOW - 7 * DAY_MS + 1),
      media("trash/listings/fresh.webp", NOW - DAY_MS),
    ];

    const expired = findExpiredTrash(files, NOW, 7 * DAY_MS);

    expect(expired.map((file) => file.relativePath)).toEqual([
      "trash/listings/old.webp",
    ]);
  });
});
