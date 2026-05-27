import { type CSSProperties } from "react";

import { statShortLabels, type ChoiceForecastView, type StatId } from "@/lib/chain/state";
import {
  formatCheckMargin,
  formatForecastRead,
  formatStrainOnStat,
} from "@/lib/game/choiceLabels";
import {
  checkBandClass,
  getCheckBand,
  getCheckMargin,
} from "@/lib/game/checkBands";
import { statClass, statColorFor, statIconFor } from "@/lib/game/statUi";
import { skillText, type SkillId } from "@/lib/rpgContent/classes";

export function SkillAction({
  busy,
  forecast,
  inactive = false,
  resolved = false,
  secondaryStat,
  xpGain,
  onChoiceClick,
  onChoose,
}: {
  busy: boolean;
  forecast: ChoiceForecastView;
  inactive?: boolean;
  resolved?: boolean;
  secondaryStat: StatId | null;
  xpGain: number;
  onChoiceClick: () => void;
  onChoose: (skillId: SkillId) => void;
}) {
  const stat = forecast.stat;
  const skill = skillText[forecast.skillId];
  const margin = getCheckMargin(forecast);
  const band = getCheckBand(margin);
  const strain = formatStrainOnStat(forecast.stat, forecast.strainBefore);
  const style = secondaryStat
    ? ({
        "--secondary-stat-color": statColorFor(secondaryStat),
      } as CSSProperties)
    : undefined;

  return (
    <button
      className={[
        "skill-action",
        "stat-tone",
        statClass(stat),
        checkBandClass(band),
        secondaryStat ? "skill-action-dual-stat" : "",
        forecast.success ? "skill-action-pass" : "skill-action-fail",
        resolved ? "skill-action-resolved" : "",
        inactive ? "skill-action-muted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={busy || inactive || resolved}
      onClick={() => {
        onChoiceClick();
        onChoose(forecast.skillId);
      }}
      style={style}
      type="button"
    >
      <span className="skill-action-head">
        <img alt="" className="stat-icon" height="32" src={statIconFor(stat)} width="32" />
        <span className="skill-action-title">{skill.label}</span>
        <span className="skill-action-stat">{statShortLabels[stat]}</span>
      </span>
      <span className="skill-action-read">{formatForecastRead(forecast)}</span>
      <span className="skill-action-meta">
        {forecast.effectiveStat}/{forecast.difficulty} ({formatCheckMargin(margin)})
        {forecast.success ? ` · +${xpGain} XP` : ` · -${forecast.healthLossOnFailure} HP`}
        {strain ? ` · ${strain}` : ""}
      </span>
    </button>
  );
}
