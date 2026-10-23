import { describe, expect, it } from "vitest";
import { normalizeVideoUrl } from "@/lib/video/normalize";

const youtubeId = "dQw4w9WgXcQ";
const tiktokId = "7412345678901234567";
const driveId = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("normalizeVideoUrl — YouTube", () => {
  it.each([
    `https://www.youtube.com/watch?v=${youtubeId}`,
    `https://www.youtube.com/watch?v=${youtubeId}&t=10s`,
    `https://youtube.com/watch?v=${youtubeId}`,
    `https://m.youtube.com/watch?v=${youtubeId}`,
    `https://youtu.be/${youtubeId}?si=tracking`,
    `https://www.youtube.com/shorts/${youtubeId}`,
    `https://www.youtube.com/embed/${youtubeId}`,
  ])("normalizes %s", (input) => {
    expect(normalizeVideoUrl(input)).toEqual({
      provider: "youtube",
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`,
    });
  });
});

describe("normalizeVideoUrl — TikTok", () => {
  it("normalizes a full TikTok video URL and drops tracking query", () => {
    expect(
      normalizeVideoUrl(
        `https://www.tiktok.com/@swiper.store/video/${tiktokId}?is_from_webapp=1&sender_device=pc`,
      ),
    ).toEqual({
      provider: "tiktok",
      canonicalUrl: `https://www.tiktok.com/@swiper.store/video/${tiktokId}`,
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`,
    });
  });

  it("accepts the bare tiktok.com host", () => {
    expect(
      normalizeVideoUrl(`https://tiktok.com/@swiper_store/video/${tiktokId}`),
    ).toMatchObject({
      provider: "tiktok",
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`,
    });
  });
});

describe("normalizeVideoUrl — Google Drive", () => {
  it.each([
    `https://drive.google.com/file/d/${driveId}/view?usp=sharing`,
    `https://drive.google.com/file/d/${driveId}/preview`,
    `https://drive.google.com/open?id=${driveId}&authuser=0`,
  ])("normalizes %s", (input) => {
    expect(normalizeVideoUrl(input)).toEqual({
      provider: "google_drive",
      canonicalUrl: `https://drive.google.com/file/d/${driveId}/view`,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
    });
  });
});

describe("normalizeVideoUrl — rejection", () => {
  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["http", `http://www.youtube.com/watch?v=${youtubeId}`],
    ["javascript", "javascript:alert(1)"],
    ["relative", `//www.youtube.com/watch?v=${youtubeId}`],
    ["ftp", `ftp://www.youtube.com/watch?v=${youtubeId}`],
    ["lookalike host", `https://www.youtube.com.evil.com/watch?v=${youtubeId}`],
    ["prefix host", `https://evil-youtube.com/watch?v=${youtubeId}`],
    ["suffix host", `https://youtube.com@evil.com/watch?v=${youtubeId}`],
    ["credentials", `https://user:pass@www.youtube.com/watch?v=${youtubeId}`],
    ["non-default port", `https://www.youtube.com:8443/watch?v=${youtubeId}`],
    ["short id", "https://www.youtube.com/watch?v=short"],
    ["twelve-char id", "https://www.youtube.com/watch?v=abcdefghijkl"],
    ["fragment", `https://www.youtube.com/watch?v=${youtubeId}#top`],
    ["playlist only", "https://www.youtube.com/playlist?list=PL123"],
    ["tiktok short vm", "https://vm.tiktok.com/ZMabcdefg/"],
    ["tiktok short vt", "https://vt.tiktok.com/ZMabcdefg/"],
    ["tiktok non-numeric id", "https://www.tiktok.com/@user/video/not-a-number"],
    ["tiktok missing user", `https://www.tiktok.com/video/${tiktokId}`],
    ["tiktok extra path", `https://www.tiktok.com/@user/video/${tiktokId}/extra`],
    ["tiktok fragment", `https://www.tiktok.com/@user/video/${tiktokId}#comments`],
    [
      "drive lookalike",
      `https://drive.google.com.evil.com/file/d/${driveId}/view`,
    ],
    ["drive missing action", `https://drive.google.com/file/d/${driveId}`],
    ["drive short id", "https://drive.google.com/file/d/abc/view"],
    ["drive open without id", "https://drive.google.com/open"],
    ["localhost", `https://localhost/watch?v=${youtubeId}`],
    ["ipv4", `https://127.0.0.1/watch?v=${youtubeId}`],
  ])("rejects %s", (_label, input) => {
    expect(normalizeVideoUrl(input)).toBeNull();
  });

  it("rejects URLs longer than 2048 characters", () => {
    const prefix = `https://www.youtube.com/watch?v=${youtubeId}&x=`;
    expect(normalizeVideoUrl(prefix + "a".repeat(2048))).toBeNull();
  });
});
