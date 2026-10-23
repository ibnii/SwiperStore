const idrFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return `Rp${idrFormatter.format(value)}`;
}
