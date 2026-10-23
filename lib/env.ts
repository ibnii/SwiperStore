import { z } from "zod";
import { normalizeWhatsAppNumber } from "./whatsapp";

const databaseUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}, "DATABASE_URL must be a valid PostgreSQL URL");

const waNumberSchema = z
  .string()
  .refine((value) => {
    try {
      normalizeWhatsAppNumber(value);
      return true;
    } catch {
      return false;
    }
  }, "WA_NUMBER must be a valid Indonesian WhatsApp number")
  .transform((value) => normalizeWhatsAppNumber(value));

const envSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  WA_NUMBER: waNumberSchema,
  UPLOAD_DIR: z.string().trim().min(1),
  SITE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}

/**
 * Validated process environment. Evaluated at import time so a broken
 * deployment configuration fails fast instead of surfacing later.
 */
export const env = parseEnv(process.env);
