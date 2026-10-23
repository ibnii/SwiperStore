import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import {
  MediaValidationError,
  processListingImage,
} from "./image";
import { mediaUrlToRelativePath, resolveMediaFilePath } from "./paths";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const FILE_MODE = 0o640;
const DIR_MODE = 0o750;

export type SavedImage = {
  path: string;
  width: number;
  height: number;
};

export async function saveListingImage(file: File): Promise<SavedImage> {
  if (file.size === 0) {
    throw new MediaValidationError("File gambar wajib diisi.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError("Ukuran gambar maksimal 8 MB.");
  }

  let input: Buffer;

  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    throw new MediaValidationError("File gambar tidak valid atau rusak.");
  }

  const processed = await processListingImage(input);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const fileName = `${randomUUID()}.webp`;
  const relativePath = `listings/${year}/${month}/${fileName}`;
  const directory = path.join(
    path.resolve(env.UPLOAD_DIR),
    "listings",
    year,
    month,
  );
  const finalPath = path.join(directory, fileName);
  const temporaryPath = path.join(
    directory,
    `.${fileName}.${randomUUID()}.tmp`,
  );

  await mkdir(directory, { recursive: true, mode: DIR_MODE });

  try {
    await writeFile(temporaryPath, processed.data, {
      mode: FILE_MODE,
      flag: "wx",
    });
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }

  return {
    path: `/media/${relativePath}`,
    width: processed.width,
    height: processed.height,
  };
}

/**
 * Moves a public media file into the sibling trash directory. The trash lives
 * outside the served upload root, so removed thumbnails are never reachable.
 */
export async function trashListingImage(publicPath: string): Promise<void> {
  const relative = mediaUrlToRelativePath(publicPath);
  const source = resolveMediaFilePath(env.UPLOAD_DIR, publicPath);

  if (!relative || !source) {
    throw new MediaValidationError("Path media tidak valid.");
  }

  const trashRoot = path.resolve(env.UPLOAD_DIR, "..", "trash");
  const target = path.join(trashRoot, ...relative.split("/"));

  if (!target.startsWith(trashRoot + path.sep)) {
    throw new MediaValidationError("Path media tidak valid.");
  }

  await mkdir(path.dirname(target), { recursive: true, mode: DIR_MODE });

  try {
    await rename(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }
}
