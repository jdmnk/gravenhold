import { statShortLabels, type ChoiceForecastView, type RunBundle } from "@/lib/chain/state";
import { getEffectiveStat, getSecondHighestEffectiveStat } from "@/lib/game/stats";

export function BossSupportBanner({
  bundle,
  forecast,
}: {
  bundle: RunBundle;
  forecast: ChoiceForecastView;
}) {
  if (!forecast.bossEncounter || forecast.bossSupportRequired <= 0) {
    return null;
  }

  const supportStat = getSecondHighestEffectiveStat(bundle);
  const supportValue = getEffectiveStat(bundle, supportStat);
  const meetsSupport = supportValue >= forecast.bossSupportRequired;
  const shortfall = forecast.bossSupportRequired - supportValue;

  return (
    <aside
      aria-label="Boss gate support"
      className={[
        "boss-support-banner",
        "stat-tone",
        `stat-${supportStat}`,
        meetsSupport ? "boss-support-ready" : "boss-support-low",
      ].join(" ")}
    >
      <b>Boss gate</b>
      <p>
        Keep your second-highest stat at {forecast.bossSupportRequired}+ to soften
        the fight. {statShortLabels[supportStat]} is {supportValue}
        {meetsSupport
          ? " — ready."
          : ` — ${shortfall} short.`}
      </p>
      {forecast.bossSupportDifficultyAmount > 0 ? (
        <p className="boss-support-penalty">
          Underprepared: +{forecast.bossSupportDifficultyAmount} difficulty
          {forecast.bossSupportDamageAmount > 0
            ? `, +${forecast.bossSupportDamageAmount} failure damage`
            : ""}
          .
        </p>
      ) : null}
    </aside>
  );
}
