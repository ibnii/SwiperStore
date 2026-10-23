const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_DIMENSION = 1600;

const FORMAT_MESSAGE =
  "Gunakan JPG, PNG, atau WebP. Foto iPhone: ekspor sebagai JPG.";
const CORRUPT_MESSAGE = "File gambar tidak valid atau rusak.";

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
};

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }

  return HEIC_BRANDS.has(buffer.toString("ascii", 8, 12));
}

let sharpModule: Promise<typeof import("sharp").default> | undefined;

function loadSharp(): Promise<typeof import("sharp").default> {
  // Loaded lazily so a broken native binary only affects uploads, not startup.
  sharpModule ??= import("sharp").then((module) => module.default);
  return sharpModule;
}

export async function processListingImage(
  input: Buffer,
): Promise<ProcessedImage> {
  if (input.length === 0) {
    throw new MediaValidationError("File gambar wajib diisi.");
  }

  if (isHeic(input)) {
    throw new MediaValidationError(FORMAT_MESSAGE);
  }

  let sharp: typeof import("sharp").default;

  try {
    sharp = await loadSharp();
  } catch {
    throw new MediaValidationError("Pemrosesan gambar tidak tersedia.");
  }

  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    const metadata = await image.metadata();

    if (
      !metadata.format ||
      !ALLOWED_FORMATS.has(metadata.format) ||
      (metadata.format as string) === "heif"
    ) {
      throw new MediaValidationError(FORMAT_MESSAGE);
    }

    if (!metadata.width || !metadata.height) {
      throw new MediaValidationError(CORRUPT_MESSAGE);
    }

    if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      throw new MediaValidationError("Gambar maksimal 40 megapiksel.");
    }

    const { data, info } = await image
      .rotate()
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof MediaValidationError) {
      throw error;
    }

    if (String(error).toLowerCase().includes("pixel limit")) {
      throw new MediaValidationError("Gambar maksimal 40 megapiksel.");
    }

    throw new MediaValidationError(CORRUPT_MESSAGE);
  }
}
