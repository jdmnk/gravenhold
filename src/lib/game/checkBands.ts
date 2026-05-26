import type { ChoiceForecastView } from "@/lib/chain/state";

export type CheckBand = "very_risky" | "risky" | "even" | "favored" | "strong";

export function getCheckMargin(
  forecast: Pick<ChoiceForecastView, "difficulty" | "effectiveStat">,
): number {
  return forecast.effectiveStat - forecast.difficulty;
}

export function getCheckBand(margin: number): CheckBand {
  if (margin <= -3) return "very_risky";
  if (margin <= -1) return "risky";
  if (margin === 0) return "even";
  if (margin <= 2) return "favored";
  return "strong";
}

export function formatCheckBand(band: CheckBand): string {
  switch (band) {
    case "very_risky":
      return "Very risky";
    case "risky":
      return "Risky";
    case "even":
      return "Even";
    case "favored":
      return "Favored";
    case "strong":
      return "Strong";
  }
}

export function formatCheckRead(margin: number, success: boolean): string {
  const band = formatCheckBand(getCheckBand(margin));
  return `${band} — ${success ? "Pass" : "Fail"}`;
}

export function checkBandClass(band: CheckBand): string {
  return `check-band-${band.replace("_", "-")}`;
}
