import { MEDIA_URL_PREFIX } from "./paths";

export type ScannableFile = {
  absolutePath: string;
  relativePath: string;
  mtimeMs: number;
};

/**
 * Served files that no listing points at. Paths are compared as exact media
 * URLs, so `used.webp` never protects `used.webp.bak` or a shorter prefix.
 */
export function findOrphanedMedia(
  files: ScannableFile[],
  referencedPaths: Iterable<string>,
): ScannableFile[] {
  const referenced = new Set(referencedPaths);

  return files.filter(
    (file) => !referenced.has(`${MEDIA_URL_PREFIX}${file.relativePath}`),
  );
}

/** Trash files whose age has reached the retention window. */
export function findExpiredTrash(
  files: ScannableFile[],
  now: number,
  retentionMs: number,
): ScannableFile[] {
  const cutoff = now - retentionMs;

  return files.filter((file) => file.mtimeMs < cutoff);
}
