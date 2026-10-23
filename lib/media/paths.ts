import path from "node:path";

export const MEDIA_URL_PREFIX = "/media/";

const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Only WebP files under the listings tree are served. Segments are checked
 * individually so encoded traversal, backslashes, NUL bytes, and hidden files
 * never reach the filesystem.
 */
export function isSafeMediaRelativePath(relative: string): boolean {
  if (!relative.startsWith("listings/")) {
    return false;
  }

  if (relative.includes("\\") || relative.includes("\0")) {
    return false;
  }

  const segments = relative.split("/");

  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment.startsWith(".") ||
      !SEGMENT_PATTERN.test(segment)
    ) {
      return false;
    }
  }

  return segments[segments.length - 1].endsWith(".webp");
}

export function mediaUrlToRelativePath(urlPath: string): string | null {
  if (!urlPath.startsWith(MEDIA_URL_PREFIX)) {
    return null;
  }

  const relative = urlPath.slice(MEDIA_URL_PREFIX.length);
  return isSafeMediaRelativePath(relative) ? relative : null;
}

export function resolveMediaFilePath(
  uploadDir: string,
  urlPath: string,
): string | null {
  const relative = mediaUrlToRelativePath(urlPath);

  if (!relative) {
    return null;
  }

  const root = path.resolve(uploadDir);
  const resolved = path.resolve(root, ...relative.split("/"));

  if (!resolved.startsWith(root + path.sep)) {
    return null;
  }

  return resolved;
}
