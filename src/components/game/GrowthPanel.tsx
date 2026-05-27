import { useEffect, useMemo, useState } from "react";

import { ScenePendingOverlay } from "@/components/game/EncounterPanel";
import { statIds, statLabels, type RunBundle, type StatId } from "@/lib/chain/state";
import { type GrowthAllocation } from "@/lib/chain/systems";
import { type PendingAction } from "@/lib/game/pendingAction";
import { getPhaseLabel } from "@/lib/game/runDisplay";
import { skillLaneLabel } from "@/lib/game/skillLanes";
import { StatChip, statClass, statIconFor } from "@/lib/game/statUi";
import {
  classText,
  isSkillUnlocked,
  skillPrerequisites,
  skillText,
  skillsForClass,
  type SkillId,
} from "@/lib/rpgContent/classes";

function hasRequiredStats(
  stats: Record<StatId, number>,
  requirements: Partial<Record<StatId, number>> | undefined,
): boolean {
  if (!requirements) return true;
  return statIds.every((stat) => stats[stat] >= (requirements[stat] ?? 0));
}

function canLearnSkill(
  bundle: RunBundle,
  projectedStats: Record<StatId, number>,
  skillId: SkillId,
): boolean {
  const prerequisite = skillPrerequisites[skillId];
  return (
    bundle.character.skillPoints > 0 &&
    !isSkillUnlocked(bundle.character.unlockedSkillsBits, skillId) &&
    (!prerequisite ||
      isSkillUnlocked(bundle.character.unlockedSkillsBits, prerequisite)) &&
    hasRequiredStats(projectedStats, skillText[skillId].requiredStats)
  );
}

function SkillRequirementList({ skillId }: { skillId: SkillId }) {
  const skill = skillText[skillId];
  const prerequisite = skillPrerequisites[skillId];
  const statRequirements = statIds
    .map((stat) => {
      const value = skill.requiredStats?.[stat] ?? 0;
      return value > 0 ? { stat, value } : null;
    })
    .filter((requirement): requirement is { stat: StatId; value: number } =>
      Boolean(requirement),
    );

  if (!prerequisite && statRequirements.length === 0) {
    return <span>Starter</span>;
  }

  return (
    <>
      {prerequisite ? (
        <span className="skill-prerequisite">{skillText[prerequisite].label}</span>
      ) : null}
      {statRequirements.map((requirement) => (
        <StatChip
          key={requirement.stat}
          stat={requirement.stat}
          value={requirement.value}
        />
      ))}
    </>
  );
}

export function GrowthPanel({
  bundle,
  busy,
  pendingAction,
  pendingLabel,
  onAllocateGrowth,
}: {
  bundle: RunBundle;
  busy: boolean;
  pendingAction: PendingAction | null;
  pendingLabel: string | null;
  onAllocateGrowth: (allocation: GrowthAllocation, skillId: SkillId | null) => void;
}) {
  const [allocation, setAllocation] = useState<GrowthAllocation>({
    agility: 0,
    intellect: 0,
    spirit: 0,
    strength: 0,
  });
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);

  useEffect(() => {
    if (bundle.run.phase !== "growth") return;
    setAllocation({
      agility: 0,
      intellect: 0,
      spirit: 0,
      strength: 0,
    });
    setSelectedSkill(null);
  }, [
    bundle.character.skillPoints,
    bundle.character.statPoints,
    bundle.run.id,
    bundle.run.phase,
  ]);

  const allocatedPoints = statIds.reduce((sum, stat) => sum + allocation[stat], 0);
  const remainingPoints = bundle.character.statPoints - allocatedPoints;
  const nextStep = getPhaseLabel(bundle.run.pendingPhase);
  const classInfo = classText[bundle.character.classId];
  const skillsByLane = useMemo(() => {
    const lanes = new Map<number, SkillId[]>();
    for (const skillId of skillsForClass(bundle.character.classId)) {
      const tier = skillText[skillId].tier;
      const lane = lanes.get(tier) ?? [];
      lane.push(skillId);
      lanes.set(tier, lane);
    }
    return [...lanes.entries()].sort(([firstTier], [secondTier]) => firstTier - secondTier);
  }, [bundle.character.classId]);
  const projectedStats = statIds.reduce<Record<StatId, number>>(
    (stats, stat) => {
      stats[stat] = bundle.character.baseStats[stat] + allocation[stat];
      return stats;
    },
    {} as Record<StatId, number>,
  );
  const selectedSkillCanUnlock = selectedSkill
    ? canLearnSkill(bundle, projectedStats, selectedSkill)
    : true;
  const canConfirm = remainingPoints === 0 && !busy && selectedSkillCanUnlock;

  function updateAllocation(stat: StatId, delta: number) {
    setAllocation((current) => {
      const nextValue = current[stat] + delta;
      const currentTotal = statIds.reduce((sum, id) => sum + current[id], 0);
      if (nextValue < 0) return current;
      if (delta > 0 && currentTotal >= bundle.character.statPoints) return current;
      return { ...current, [stat]: nextValue };
    });
  }

  return (
    <section aria-label="Character growth" className="stat-allocation-panel">
      {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
      <header className="stat-allocation-header">
        <div>
          <h2>
            {classInfo.label} · L{bundle.character.xpLevel}
          </h2>
          <p>
            Spend {bundle.character.statPoints} stat
            {bundle.character.statPoints === 1 ? "" : "s"}
            {bundle.character.skillPoints > 0
              ? ` · ${bundle.character.skillPoints} skill optional`
              : ""}
          </p>
        </div>
        <div className="xp-readout">
          <b>
            {remainingPoints} stat left
          </b>
          <p>Next: {nextStep}</p>
        </div>
      </header>

      <div className="growth-panel-body">
        <div className="stat-allocation-list growth-stat-grid">
          {statIds.map((stat) => (
            <article
              className={`stat-allocation-row stat-growth-row stat-tone ${statClass(stat)}`}
              key={stat}
            >
              <div className="stat-allocation-topline">
                <img
                  alt=""
                  className="stat-icon"
                  height="32"
                  src={statIconFor(stat)}
                  width="32"
                />
                <h3>{statLabels[stat]}</h3>
              </div>
              <dl className="growth-stat-readout">
                <div>
                  <dt>Now</dt>
                  <dd>{bundle.character.baseStats[stat]}</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>{projectedStats[stat]}</dd>
                </div>
              </dl>
              <div className="stat-stepper" aria-label={`${statLabels[stat]} allocation`}>
                <button
                  disabled={busy || allocation[stat] <= 0}
                  onClick={() => updateAllocation(stat, -1)}
                  type="button"
                >
                  -
                </button>
                <b>{allocation[stat]}</b>
                <button
                  disabled={busy || remainingPoints <= 0}
                  onClick={() => updateAllocation(stat, 1)}
                  type="button"
                >
                  +
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="skill-growth-list">
          {skillsByLane.map(([tier, laneSkills]) => (
            <section className="growth-lane-group" key={tier}>
              <h3 className="growth-lane-header">{skillLaneLabel(tier)}</h3>
              <div className="growth-lane-skills">
                {laneSkills.map((skillId) => {
              const skill = skillText[skillId];
              const unlocked = isSkillUnlocked(
                bundle.character.unlockedSkillsBits,
                skillId,
              );
              const prerequisite = skillPrerequisites[skillId];
              const prerequisiteUnlocked =
                !prerequisite ||
                isSkillUnlocked(bundle.character.unlockedSkillsBits, prerequisite);
              const hasStats = hasRequiredStats(projectedStats, skill.requiredStats);
              const canLearn =
                !unlocked &&
                bundle.character.skillPoints > 0 &&
                prerequisiteUnlocked &&
                hasStats;
              const selected = selectedSkill === skillId;
              const pending =
                pendingAction?.kind === "growth" && pendingAction.skillId === skillId;
              const skillStateClass = unlocked
                ? " is-known"
                : !canLearn
                  ? " is-locked"
                  : selected
                    ? " is-selected"
                    : " is-available";

              return (
                <article
                  className={`stat-allocation-row skill-growth-row stat-tone ${statClass(skill.stat)}${skillStateClass}`}
                  key={skillId}
                >
                  <div className="stat-allocation-topline">
                    <img
                      alt=""
                      className="stat-icon"
                      height="32"
                      src={statIconFor(skill.stat)}
                      width="32"
                    />
                    <h3>{skill.label}</h3>
                  </div>
                  <div className="skill-growth-meta">
                    <StatChip stat={skill.stat} />
                    {skill.bridgeStat ? <StatChip stat={skill.bridgeStat} /> : null}
                    <SkillRequirementList skillId={skillId} />
                  </div>
                  <button
                    disabled={busy || unlocked || !canLearn}
                    onClick={() => setSelectedSkill(selected ? null : skillId)}
                    type="button"
                  >
                    {unlocked
                      ? "Known"
                      : !prerequisiteUnlocked
                        ? "Locked"
                        : !hasStats
                          ? "Needs stats"
                          : bundle.character.skillPoints <= 0
                            ? "No points"
                            : pending
                              ? "Learning..."
                              : selected
                                ? "Selected"
                                : "Pick"}
                  </button>
                </article>
              );
            })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="stat-allocation-actions">
        <p>
          {selectedSkill
            ? selectedSkillCanUnlock
              ? `${skillText[selectedSkill].label} will be learned with this allocation.`
              : `${skillText[selectedSkill].label} needs different stats.`
            : bundle.character.skillPoints > 0
              ? "No skill selected. Skill points will be saved."
              : "Confirm the stat allocation to continue."}
        </p>
        <button
          disabled={!canConfirm}
          onClick={() => onAllocateGrowth(allocation, selectedSkill)}
          type="button"
        >
          {pendingAction?.kind === "growth" ? "Confirming..." : "Confirm"}
        </button>
      </footer>
    </section>
  );
}
