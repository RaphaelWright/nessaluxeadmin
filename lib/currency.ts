const cediFormatter = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return `GH₵ ${cediFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}
