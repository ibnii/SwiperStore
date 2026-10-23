type WhatsAppCtaProps = {
  href: string;
  isSold: boolean;
  testId: string;
  compact?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function WhatsAppCta({
  href,
  isSold,
  testId,
  compact = false,
}: WhatsAppCtaProps) {
  const sizeClass = compact
    ? "px-3 py-3 text-xs"
    : "w-full px-5 py-3.5 text-sm";

  if (isSold) {
    return (
      <button
        type="button"
        disabled
        data-testid={testId}
        className={`${baseClass} ${sizeClass} cursor-not-allowed border border-border bg-elevated text-muted`}
      >
        Sudah terjual
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      className={`${baseClass} ${sizeClass} bg-gold text-background hover:bg-champagne`}
    >
      Beli via WhatsApp
    </a>
  );
}
