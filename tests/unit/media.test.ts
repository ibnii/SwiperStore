import { access, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { crc32 } from "node:zlib";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import {
  MediaValidationError,
  processListingImage,
} from "@/lib/media/image";
import {
  isSafeMediaRelativePath,
  mediaUrlToRelativePath,
  resolveMediaFilePath,
} from "@/lib/media/paths";
import {
  MAX_UPLOAD_BYTES,
  saveListingImage,
  trashListingImage,
} from "@/lib/media/storage";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR!);

async function makeJpeg(width = 2000, height = 1000): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 30, b: 30 },
    },
  })
    .withMetadata({ orientation: 6 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function makePng(width = 100, height = 50): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 20, g: 120, b: 200, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

function pngWithDimensions(width: number, height: number): Buffer {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)) >>> 0, 29);

  return png;
}

function imageFile(data: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(data)], name, { type });
}

afterAll(async () => {
  await rm(uploadRoot, { recursive: true, force: true });
  await rm(path.resolve(uploadRoot, "..", "trash"), {
    recursive: true,
    force: true,
  });
});

describe("media path validation", () => {
  it("accepts only listings WebP paths", () => {
    expect(
      isSafeMediaRelativePath("listings/2026/10/2f1c.webp"),
    ).toBe(true);
    expect(isSafeMediaRelativePath("listings/seed/akun-01.webp")).toBe(true);
    expect(isSafeMediaRelativePath("listings/2026/10/2f1c.jpg")).toBe(false);
    expect(isSafeMediaRelativePath("other/2026/10/2f1c.webp")).toBe(false);
    expect(isSafeMediaRelativePath("listings/2026/10/.hidden.webp")).toBe(
      false,
    );
    expect(isSafeMediaRelativePath("listings/2026/10/2f1c.webp/")).toBe(false);
  });

  it.each([
    ["parent traversal", "/media/listings/../../etc/passwd.webp"],
    ["nested traversal", "/media/listings/2026/../../x.webp"],
    ["backslash", "/media/listings/2026/10/x\\..\\y.webp"],
    ["nul byte", "/media/listings/2026/10/x\0.webp"],
    ["absolute", "/media//etc/passwd.webp"],
    ["prefix", "/media/listings-other/2026/10/x.webp"],
    ["wrong extension", "/media/listings/2026/10/x.png"],
    ["empty segments", "/media/listings//10/x.webp"],
  ])("rejects %s", (_label, urlPath) => {
    expect(isSafeMediaRelativePath(mediaUrlToRelativePath(urlPath) ?? "")).toBe(
      false,
    );
    expect(resolveMediaFilePath(uploadRoot, urlPath)).toBeNull();
  });

  it("resolves a valid path inside the upload root", () => {
    const resolved = resolveMediaFilePath(
      uploadRoot,
      "/media/listings/2026/10/2f1c.webp",
    );

    expect(resolved).toBe(
      path.join(uploadRoot, "listings", "2026", "10", "2f1c.webp"),
    );
  });
});

describe("processListingImage", () => {
  it("re-encodes JPEG to WebP, rotates by EXIF, and caps the long side at 1600px", async () => {
    const result = await processListingImage(await makeJpeg());

    expect(result.width).toBe(800);
    expect(result.height).toBe(1600);

    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1600);
    expect(metadata.exif).toBeUndefined();
  });

  it("converts PNG to WebP without enlarging small images", async () => {
    const result = await processListingImage(await makePng());

    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect((await sharp(result.data).metadata()).format).toBe("webp");
  });

  it.each([
    ["SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ["plain text", Buffer.from("bukan gambar")],
    ["empty buffer", Buffer.alloc(0)],
  ])("rejects %s", async (_label, input) => {
    await expect(processListingImage(input)).rejects.toBeInstanceOf(
      MediaValidationError,
    );
  });

  it("rejects images above 40 megapixels", async () => {
    await expect(
      processListingImage(pngWithDimensions(6500, 6500)),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });

  it("rejects HEIC with an iPhone export hint", async () => {
    const heic = Buffer.alloc(32);
    heic.write("ftypheic", 4, "ascii");

    await expect(processListingImage(heic)).rejects.toThrow(
      "Gunakan JPG, PNG, atau WebP. Foto iPhone: ekspor sebagai JPG.",
    );
  });
});

describe("saveListingImage", () => {
  it("writes an atomic WebP file with a UUID name and safe permissions", async () => {
    const file = imageFile(await makeJpeg(), "akun.jpg", "image/jpeg");

    const saved = await saveListingImage(file);

    expect(saved.path).toMatch(
      /^\/media\/listings\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/,
    );
    expect(saved.width).toBe(800);
    expect(saved.height).toBe(1600);

    const absolute = path.join(
      uploadRoot,
      saved.path.slice("/media/".length),
    );
    const fileStat = await stat(absolute);
    const contents = await readFile(absolute);

    expect(fileStat.isFile()).toBe(true);
    expect(fileStat.mode & 0o777).toBe(0o640);
    expect((await sharp(contents).metadata()).format).toBe("webp");
  });

  it("rejects an empty file", async () => {
    const file = new File([], "kosong.jpg", { type: "image/jpeg" });
    await expect(saveListingImage(file)).rejects.toThrow(
      "File gambar wajib diisi.",
    );
  });

  it("rejects files larger than 8 MB before decoding", async () => {
    const file = new File(
      [new Uint8Array(MAX_UPLOAD_BYTES + 1)],
      "besar.jpg",
      { type: "image/jpeg" },
    );

    await expect(saveListingImage(file)).rejects.toThrow(
      "Ukuran gambar maksimal 8 MB.",
    );
  });

  it("does not trust the client MIME type", async () => {
    const file = imageFile(Buffer.from("bukan gambar"), "palsu.jpg", "image/jpeg");

    await expect(saveListingImage(file)).rejects.toBeInstanceOf(
      MediaValidationError,
    );
  });
});

describe("trashListingImage", () => {
  it("moves the file out of the public upload root", async () => {
    const saved = await saveListingImage(
      imageFile(await makePng(), "akun.png", "image/png"),
    );
    const original = path.join(
      uploadRoot,
      saved.path.slice("/media/".length),
    );
    const trashed = path.resolve(
      uploadRoot,
      "..",
      "trash",
      saved.path.slice("/media/".length),
    );

    await trashListingImage(saved.path);

    await expect(access(original)).rejects.toThrow();
    await expect(access(trashed)).resolves.toBeUndefined();
  });

  it("is idempotent when the file is already gone", async () => {
    await expect(
      trashListingImage("/media/listings/2026/10/tidak-ada.webp"),
    ).resolves.toBeUndefined();
  });

  it("rejects a path outside the media tree", async () => {
    await expect(
      trashListingImage("/media/../secret.webp"),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });
});
