import { describe, expect, it } from "vitest";
import {
  ageFromISO,
  formatDateLong,
  formatThousands,
  parseMoney,
  pct,
  usd,
  usdCents,
  yearsMonthsLabel,
} from "@/lib/format";

describe("usd", () => {
  it("formats whole dollars with commas", () => {
    expect(usd(1234567.4)).toBe("$1,234,567");
  });
  it("handles negatives", () => {
    expect(usd(-950.6)).toBe("-$951");
  });
  it("handles non-finite input", () => {
    expect(usd(NaN)).toBe("$0");
    expect(usd(Infinity)).toBe("$0");
  });
});

describe("usdCents", () => {
  it("keeps two decimals", () => {
    expect(usdCents(1234.5)).toBe("$1,234.50");
  });
});

describe("formatThousands / parseMoney", () => {
  it("round-trips a formatted value", () => {
    expect(formatThousands(85000)).toBe("85,000");
    expect(parseMoney("$85,000")).toBe(85000);
  });
  it("parses decimals and whitespace", () => {
    expect(parseMoney(" 1,234.56 ")).toBe(1234.56);
  });
  it("returns 0 for junk", () => {
    expect(parseMoney("abc")).toBe(0);
    expect(parseMoney("")).toBe(0);
  });
});

describe("yearsMonthsLabel", () => {
  it("shows years and months", () => {
    expect(yearsMonthsLabel(4 + 7 / 12)).toBe("4 years, 7 months");
  });
  it("shows months only under a year", () => {
    expect(yearsMonthsLabel(11 / 12)).toBe("11 months");
  });
  it("shows years only when months round to zero", () => {
    expect(yearsMonthsLabel(3.001)).toBe("3 years");
  });
  it("rolls 12 months into a year", () => {
    expect(yearsMonthsLabel(1.999)).toBe("2 years");
  });
  it("handles ~zero", () => {
    expect(yearsMonthsLabel(0.01)).toBe("less than a month");
  });
});

describe("formatDateLong", () => {
  it("formats ISO dates", () => {
    expect(formatDateLong("2031-06-15")).toBe("June 15, 2031");
  });
  it("returns empty string for invalid input", () => {
    expect(formatDateLong("not-a-date")).toBe("");
  });
});

describe("ageFromISO", () => {
  it("computes decimal age", () => {
    const age = ageFromISO("1985-01-01", new Date("2025-01-01T00:00:00"));
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThan(39.9);
    expect(age!).toBeLessThan(40.1);
  });
  it("returns null for empty/invalid", () => {
    expect(ageFromISO("")).toBeNull();
    expect(ageFromISO("garbage")).toBeNull();
  });
});

describe("pct", () => {
  it("formats decimals as percents", () => {
    expect(pct(0.75)).toBe("75%");
    expect(pct(0.025, 1)).toBe("2.5%");
  });
});
