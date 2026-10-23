const INVALID_NUMBER_MESSAGE = "Nomor WhatsApp tidak valid";

/**
 * Normalizes an Indonesian WhatsApp number into the 62-prefixed digits-only
 * form used by wa.me links.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/[\s\-()+]/g, "");

  if (!/^\d+$/.test(digits)) {
    throw new Error(INVALID_NUMBER_MESSAGE);
  }

  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;

  if (
    !normalized.startsWith("62") ||
    normalized.length < 10 ||
    normalized.length > 15
  ) {
    throw new Error(INVALID_NUMBER_MESSAGE);
  }

  return normalized;
}

export function buildWhatsAppMessage(code: string): string {
  return `Halo min, saya ingin membeli akun dengan Id ${code}`;
}

export function buildWhatsAppUrl(number: string, code: string): string {
  const normalized = normalizeWhatsAppNumber(number);
  const message = buildWhatsAppMessage(code);

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
