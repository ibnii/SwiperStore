const MAX_URL_LENGTH = 2048;

const YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
]);
const TIKTOK_HOSTS = new Set(["www.tiktok.com", "tiktok.com", "m.tiktok.com"]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_SHORT_PATH = /^\/([A-Za-z0-9_-]{11})\/?$/;
const YOUTUBE_SHORTS_PATH = /^\/shorts\/([A-Za-z0-9_-]{11})\/?$/;
const YOUTUBE_EMBED_PATH = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/;
const TIKTOK_PATH = /^\/(@[A-Za-z0-9._-]+)\/video\/(\d{6,25})\/?$/;
const DRIVE_FILE_PATH = /^\/file\/d\/([A-Za-z0-9_-]{10,100})\/(?:view|preview)\/?$/;

export type NormalizedVideo = {
  provider: "youtube" | "tiktok" | "google_drive";
  canonicalUrl: string;
  embedUrl: string;
};

function youtubeEmbed(id: string): NormalizedVideo {
  return {
    provider: "youtube",
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
  };
}

function normalizeYouTube(url: URL): NormalizedVideo | null {
  if (url.hostname === "youtu.be") {
    const match = YOUTUBE_SHORT_PATH.exec(url.pathname);
    return match ? youtubeEmbed(match[1]) : null;
  }

  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    return id && YOUTUBE_ID.test(id) ? youtubeEmbed(id) : null;
  }

  const shorts = YOUTUBE_SHORTS_PATH.exec(url.pathname);
  if (shorts) {
    return youtubeEmbed(shorts[1]);
  }

  const embed = YOUTUBE_EMBED_PATH.exec(url.pathname);
  return embed ? youtubeEmbed(embed[1]) : null;
}

function normalizeTikTok(url: URL): NormalizedVideo | null {
  const match = TIKTOK_PATH.exec(url.pathname);
  if (!match) {
    return null;
  }

  const [, user, id] = match;

  return {
    provider: "tiktok",
    canonicalUrl: `https://www.tiktok.com/${user}/video/${id}`,
    embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
  };
}

function normalizeDrive(url: URL): NormalizedVideo | null {
  let id: string | null = null;

  if (url.pathname === "/open") {
    id = url.searchParams.get("id");
  } else {
    const match = DRIVE_FILE_PATH.exec(url.pathname);
    id = match?.[1] ?? null;
  }

  if (!id || !/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    return null;
  }

  return {
    provider: "google_drive",
    canonicalUrl: `https://drive.google.com/file/d/${id}/view`,
    embedUrl: `https://drive.google.com/file/d/${id}/preview`,
  };
}

/**
 * Accepts only full HTTPS URLs from the supported providers and returns the
 * canonical watch URL plus a server-built embed URL. Anything else returns
 * null so the caller can reject it with a user-facing message.
 */
export function normalizeVideoUrl(raw: string): NormalizedVideo | null {
  const value = raw.trim();

  if (value.length === 0 || value.length > MAX_URL_LENGTH) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }

  // URL normalizes the default HTTPS port to an empty string.
  if (url.port !== "") {
    return null;
  }

  if (url.hash !== "") {
    return null;
  }

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    return normalizeYouTube(url);
  }

  if (TIKTOK_HOSTS.has(url.hostname)) {
    return normalizeTikTok(url);
  }

  if (url.hostname === "drive.google.com") {
    return normalizeDrive(url);
  }

  return null;
}
