import { z } from "zod";
import { normalizeVideoUrl } from "@/lib/video/normalize";
import type { ListingInput } from "./types";

export const listingInputSchema: z.ZodType<ListingInput> = z.object({
  title: z
    .string({ error: "Judul wajib berupa teks." })
    .trim()
    .min(3, { message: "Judul minimal 3 karakter." })
    .max(100, { message: "Judul maksimal 100 karakter." }),
  description: z
    .string({ error: "Deskripsi wajib berupa teks." })
    .trim()
    .min(10, { message: "Deskripsi minimal 10 karakter." })
    .max(5000, { message: "Deskripsi maksimal 5.000 karakter." }),
  priceIdr: z
    .number({ error: "Harga wajib berupa angka." })
    .int({ message: "Harga harus bilangan bulat." })
    .positive({ message: "Harga harus lebih dari Rp0." })
    .max(1_000_000_000, { message: "Harga maksimal Rp1.000.000.000." }),
  videoUrl: z
    .string({ error: "URL video wajib berupa teks." })
    .trim()
    .min(1, { message: "URL video wajib diisi." })
    .max(2048, { message: "URL video maksimal 2.048 karakter." })
    .refine((value) => normalizeVideoUrl(value) !== null, {
      message:
        "Gunakan URL lengkap YouTube, TikTok, atau Google Drive yang valid.",
    }),
  isSold: z.boolean({ error: "Status terjual tidak valid." }),
});
