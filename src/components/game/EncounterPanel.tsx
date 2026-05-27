import * as Popover from "@radix-ui/react-popover";

import { BossSupportBanner } from "@/components/game/BossSupportBanner";
import { SkillAction } from "@/components/game/SkillAction";
import {
  ItemBonusList,
  RewardComparison,
} from "@/components/game/CharacterColumn";
import { NarrativeBeatBanner } from "@/components/game/NarrativeBeat";
import { SceneEffectsLayer } from "@/components/fx/SceneEffectsLayer";
import { encounterBackgroundFor, itemIconFor } from "@/lib/assets/gameAssets";
import {
  formatDelta,
  slotLabels,
  statShortLabels,
  type ChoiceForecastView,
  type ChoiceLogView,
  type EncounterCategory,
  type EncounterDifficulty,
  type RewardOfferView,
  type RunBundle,
  type StatId,
} from "@/lib/chain/state";
import { type PendingAction } from "@/lib/game/pendingAction";
import { formatCheckMargin } from "@/lib/game/choiceLabels";
import { formatCheckRead } from "@/lib/game/checkBands";
import {
  choiceLogKey,
  getEncounterText,
  getEncounterXp,
  getEquippedItemForSlot,
  getItemPrimaryStat,
  getItemText,
  getItemView,
} from "@/lib/game/runDisplay";
import { getSecondHighestEffectiveStat, getDominantEffectiveStat } from "@/lib/game/stats";
import { statClass } from "@/lib/game/statUi";
import { type SkillId } from "@/lib/rpgContent/classes";

const encounterCategoryLabels: Record<EncounterCategory, string> = {
  boss: "Boss",
  enemy: "Enemy",
  mystery: "Mystery",
  obstacle: "Obstacle",
  social: "Social",
  survival: "Survival",
};

const encounterDifficultyLabels: Record<EncounterDifficulty, string> = {
  boss: "Boss",
  hard: "Hard",
  normal: "Normal",
};

function getChoiceSecondaryStat(
  bundle: RunBundle,
  forecast: ChoiceForecastView,
): StatId | null {
  if (!forecast.bossEncounter || forecast.bossSupportRequired <= 0) {
    return null;
  }

  const supportStat = getSecondHighestEffectiveStat(bundle);
  return supportStat === forecast.stat ? null : supportStat;
}

export function LatestResultBadge({ log }: { log: ChoiceLogView }) {
  const margin = log.effectiveStat - log.difficulty;
  return (
    <aside
      aria-label="Latest result"
      className={[
        "latest-result",
        "stat-tone",
        statClass(log.stat),
        log.success ? "result-success" : "result-fail",
      ].join(" ")}
    >
      <b>{formatCheckRead(margin, log.success)}</b>
      <p>
        {statShortLabels[log.stat]} {log.effectiveStat}/{log.difficulty} (
        {formatCheckMargin(margin)})
        {log.xpGain > 0 ? ` / +${log.xpGain} XP` : ""}
        {log.leveledUp ? ` / Level ${log.xpLevelAfter}` : ""}
        {log.healthDeltaAmount > 0
          ? ` / ${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} HP`
          : ""}
      </p>
    </aside>
  );
}

export function ScenePendingOverlay({ label }: { label: string }) {
  return (
    <section aria-label="Pending action" className="pending-panel">
      <p>{label}</p>
    </section>
  );
}

function EncounterDetailsPopover({
  baseDifficulty,
  category,
  difficulty,
}: {
  baseDifficulty: number;
  category: string;
  difficulty: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="chrome-trigger encounter-details-trigger" type="button">
          Details
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="encounter-details-popover"
          collisionPadding={10}
          side="bottom"
          sideOffset={6}
        >
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{category}</dd>
            </div>
            <div>
              <dt>Threat</dt>
              <dd>{difficulty}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{baseDifficulty}</dd>
            </div>
          </dl>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DropPickup({
  bundle,
  busy,
  pendingAction,
  reward,
  onReward,
}: {
  bundle: RunBundle;
  busy: boolean;
  pendingAction: PendingAction | null;
  reward: RewardOfferView;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
}) {
  const item = getItemView(bundle, reward.itemId);
  const text = getItemText(reward.itemId);
  const equippedItem = getEquippedItemForSlot(bundle, item.slot);
  const pending =
    pendingAction?.kind === "reward" && pendingAction.rewardIndex === reward.index;

  return (
    <article
      className={[
        "drop-pickup",
        `drop-index-${reward.index}`,
        "stat-tone",
        statClass(getItemPrimaryStat(item)),
      ].join(" ")}
    >
      <ItemIcon itemId={reward.itemId} />
      <div>
        <h3>{text.name}</h3>
        <p>
          {slotLabels[item.slot]} / Tier {item.tier}
          <ItemBonusList item={item} />
        </p>
        <RewardComparison
          equippedItem={equippedItem}
          offeredItem={item}
          dominantStat={getDominantEffectiveStat(bundle)}
        />
      </div>
      <div className="drop-actions">
        <button disabled={busy} onClick={() => onReward(reward, false)} type="button">
          {pending ? "Taking..." : "Pick up"}
        </button>
        <button disabled={busy} onClick={() => onReward(reward, true)} type="button">
          {pending ? "Equipping..." : "Equip"}
        </button>
      </div>
    </article>
  );
}

function ItemIcon({ itemId }: { itemId: number }) {
  const icon = itemIconFor(itemId);
  if (!icon) return null;
  return <img alt="" className="item-icon" height="32" src={icon} width="32" />;
}

export function EncounterPanel({
  bundle,
  busy,
  currentText,
  latestLog,
  pendingAction,
  pendingLabel,
  onChoiceClick,
  onChooseSkill,
  onReward,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText>;
  latestLog: ChoiceLogView | null;
  pendingAction: PendingAction | null;
  pendingLabel: string | null;
  onChoiceClick: () => void;
  onChooseSkill: (skillId: SkillId) => void;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
}) {
  const current = bundle.currentEncounter!;
  const background = encounterBackgroundFor(current.encounterId);
  const isBoss = current.difficultyKind === "boss";
  const showingDrops = bundle.run.phase === "reward";
  const forecasts = bundle.forecasts ? Object.values(bundle.forecasts) : [];
  const resolvedSkillId = showingDrops ? latestLog?.skillId : null;

  return (
    <section aria-label="Encounter" className="encounter-panel">
      <NarrativeBeatBanner bundle={bundle} latestLog={latestLog} />
      {forecasts[0] ? (
        <BossSupportBanner bundle={bundle} forecast={forecasts[0]} />
      ) : null}
      <div className="encounter-stage">
        <div
          className="encounter-art"
          style={{ backgroundImage: `url(${background})` }}
        >
          {isBoss ? <SceneEffectsLayer profile="boss" /> : null}
          {latestLog ? (
            <LatestResultBadge key={choiceLogKey(latestLog)} log={latestLog} />
          ) : null}
          <EncounterDetailsPopover
            baseDifficulty={current.baseDifficulty}
            category={encounterCategoryLabels[current.category]}
            difficulty={encounterDifficultyLabels[current.difficultyKind]}
          />
          {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
          <div className="scene-copy encounter-copy">
            <h2>{currentText.title}</h2>
            <p>{currentText.description}</p>
          </div>
          {showingDrops
            ? bundle.rewards.map((reward) => (
                <DropPickup
                  bundle={bundle}
                  busy={busy}
                  key={reward.index}
                  pendingAction={pendingAction}
                  reward={reward}
                  onReward={onReward}
                />
              ))
            : null}
        </div>

        {!showingDrops && forecasts.length > 0 ? (
          <div aria-label="Skill choices" className="encounter-action-bar" role="group">
            {forecasts.map((forecast) => (
              <SkillAction
                busy={busy}
                forecast={forecast}
                key={forecast.skillId}
                secondaryStat={getChoiceSecondaryStat(bundle, forecast)}
                xpGain={getEncounterXp(current)}
                onChoiceClick={onChoiceClick}
                onChoose={onChooseSkill}
              />
            ))}
          </div>
        ) : null}

        {showingDrops && resolvedSkillId ? (
          <div aria-label="Resolved skill" className="encounter-action-bar encounter-action-bar--resolved" role="group">
            {forecasts
              .filter((forecast) => forecast.skillId === resolvedSkillId)
              .map((forecast) => (
                <SkillAction
                  busy={busy}
                  forecast={forecast}
                  key={forecast.skillId}
                  resolved
                  secondaryStat={getChoiceSecondaryStat(bundle, forecast)}
                  xpGain={getEncounterXp(current)}
                  onChoiceClick={onChoiceClick}
                  onChoose={onChooseSkill}
                />
              ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
