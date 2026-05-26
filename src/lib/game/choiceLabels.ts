import type { ChoiceForecastView } from "@/lib/chain/state";
import { statShortLabels } from "@/lib/chain/state";
import {
  formatCheckBand,
  formatCheckRead,
  getCheckBand,
  getCheckMargin,
} from "@/lib/game/checkBands";

export function formatApproach(approach: ChoiceForecastView["approach"]): string {
  switch (approach) {
    case "favored":
      return "Favored";
    case "standard":
      return "Standard";
    case "strained":
      return "Strained";
  }
}

export function formatApproachDetail(
  forecast: Pick<
    ChoiceForecastView,
    "approach" | "strainBefore" | "strainDifficultyAmount"
  >,
): string {
  const base =
    forecast.approach === "favored"
      ? "Strong fit for this encounter."
      : forecast.approach === "strained"
        ? "Poor fit — harder check."
        : "Neutral fit.";

  if (forecast.strainDifficultyAmount <= 0) return base;

  return `${base} Strain +${forecast.strainDifficultyAmount} difficulty (was ${forecast.strainBefore}).`;
}

export function formatStrainOnStat(
  stat: ChoiceForecastView["stat"],
  strainBefore: number,
): string | null {
  if (strainBefore <= 0) return null;
  return `${statShortLabels[stat]} strain ${strainBefore}`;
}

export function formatForecastRead(forecast: ChoiceForecastView): string {
  const margin = getCheckMargin(forecast);
  return formatCheckRead(margin, forecast.success);
}

export function formatForecastBand(forecast: ChoiceForecastView): string {
  return formatCheckBand(getCheckBand(getCheckMargin(forecast)));
}

export function formatCheckMargin(margin: number): string {
  if (margin === 0) return "even";
  return margin > 0 ? `+${margin}` : `${margin}`;
}
