/**
 * Small pure formatting helpers shared by the UI, charts, and PDF.
 * Kept in lib so they're unit-testable.
 */

/** "$1,234" (rounds to whole dollars, handles negatives + non-finite). */
export function usd(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

/** "$123.45" — two decimals, for premiums. */
export function usdCents(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "1,234" — thousands separators, no currency symbol. */
export function formatThousands(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

/** Parse "$1,234.56", "1234", " 1,000 " → number. Invalid → 0. */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** 4.6 → "4 years, 7 months"; 0.9 → "11 months"; 3 → "3 years". */
export function yearsMonthsLabel(decimalYears: number): string {
  const total = Math.max(0, decimalYears);
  let years = Math.floor(total);
  let months = Math.round((total - years) * 12);
  if (months === 12) {
    years += 1;
    months = 0;
  }
  const yPart = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
  const mPart = months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
  if (yPart && mPart) return `${yPart}, ${mPart}`;
  if (yPart) return yPart;
  if (mPart) return mPart;
  return "less than a month";
}

/** ISO "2031-06-15" → "June 15, 2031". Invalid → "". */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Decimal age from an ISO DOB, or null if invalid/empty. */
export function ageFromISO(dob: string, asOf: Date = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return (asOf.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

/** "75%" from 0.75. */
export function pct(decimal: number, digits = 0): string {
  if (!Number.isFinite(decimal)) return "0%";
  return `${(decimal * 100).toFixed(digits)}%`;
}
