import { type CSSProperties } from "react";

import {
  formatApproach,
  formatApproachDetail,
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
import { statShortLabels, type ChoiceForecastView, type StatId } from "@/lib/chain/state";
import { skillText, type SkillId } from "@/lib/rpgContent/classes";

export function ChoiceCard({
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
  const style = secondaryStat
    ? ({
        "--secondary-stat-color": statColorFor(secondaryStat),
      } as CSSProperties)
    : undefined;

  return (
    <article
      className={[
        "choice-card",
        "stat-tone",
        statClass(stat),
        checkBandClass(band),
        secondaryStat ? "choice-card-dual-stat" : "",
        forecast.success ? "choice-likely" : "choice-danger",
        resolved ? "choice-card-resolved" : "",
        inactive ? "choice-card-muted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="choice-topline">
        <img
          alt=""
          className="stat-icon"
          height="56"
          src={statIconFor(stat)}
          width="56"
        />
        <h4>{skill.label}</h4>
        <b>{statShortLabels[stat]}</b>
      </div>
      <p className="choice-description">{skill.description}</p>
      {formatStrainOnStat(forecast.stat, forecast.strainBefore) ? (
        <p className="choice-strain">
          {formatStrainOnStat(forecast.stat, forecast.strainBefore)}
        </p>
      ) : null}
      <dl>
        <div>
          <dt>Check</dt>
          <dd>
            {forecast.effectiveStat}/{forecast.difficulty} (
            {formatCheckMargin(margin)})
          </dd>
        </div>
        <div>
          <dt>Read</dt>
          <dd>{formatForecastRead(forecast)}</dd>
        </div>
        <div>
          <dt>Approach</dt>
          <dd>{formatApproach(forecast.approach)}</dd>
        </div>
        <div>
          <dt>Fit</dt>
          <dd>{formatApproachDetail(forecast)}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>
            {forecast.success
              ? `+${xpGain} XP`
              : `-${forecast.healthLossOnFailure} HP, +${xpGain} XP`}
          </dd>
        </div>
      </dl>
      <button
        disabled={busy || inactive || resolved}
        onClick={() => {
          onChoiceClick();
          onChoose(forecast.skillId);
        }}
        type="button"
      >
        {resolved ? `Used ${skill.label}` : `Use ${skill.label}`}
      </button>
    </article>
  );
}
