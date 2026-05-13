import type { GameConfig } from "./config";
import {
  equipmentSlots,
  statIds,
  type Character,
  type Encounter,
  type EncounterDifficulty,
  type EncounterOptionApproach,
  type GameState,
  type Item,
  type LevelPlan,
  type PlannedEncounter,
  type RewardChoice,
  type StatBlock,
  type StatId,
} from "./types";

export type BuildIdentity = {
  stat: StatId;
  name: string;
  archetype: string;
  label: string;
};

export type ActProgress = {
  act: number;
  label: string;
  startLevel: number;
  endLevel: number;
  level: number;
  levelInAct: number;
  levelsInAct: number;
};

export type LevelPurposeId = "training" | "build_up" | "boss_prep" | "boss" | "final_boss" | "complete";

export type LevelPurpose = {
  id: LevelPurposeId;
  label: string;
  description: string;
};

export type PressureLevel = "low" | "medium" | "high" | "critical";

export type UnderbuiltStatus = {
  stat: StatId;
  effectiveStat: number;
  targetDifficulty: number | null;
  gap: number;
  underbuilt: boolean;
  urgent: boolean;
};

export type MilestoneStatus = {
  nextBossLevel: number | null;
  nextBossTitle: string | null;
  distanceToNextBoss: number | null;
  levelPurpose: LevelPurpose;
  pressure: PressureLevel;
  underbuilt: UnderbuiltStatus;
};

export type BossReadiness = {
  bossLevel: number;
  bossTitle: string;
  difficulty: number;
  stats: Record<StatId, BossReadinessStat>;
};

export type BossReadinessStat = {
  stat: StatId;
  effectiveStat: number;
  difficulty: number;
  gap: number;
  ready: boolean;
};

export type RunSummary = {
  totalChoices: number;
  successes: number;
  failures: number;
  bossFailures: number;
  bossesDefeated: number;
  levelsCleared: number;
  chosenStatsCount: number;
  dominantStat: StatId;
  buildConsistency: number;
  choiceCounts: StatBlock;
  successCounts: StatBlock;
  failureCounts: StatBlock;
};

export type LevelRunSummary = {
  level: number;
  totalChoices: number;
  successes: number;
  failures: number;
  bossFailures: number;
  bossDefeated: boolean;
  dominantStat: StatId;
  choiceCounts: StatBlock;
};

export type RewardComparison = {
  reward: RewardChoice | null;
  item: Item;
  slotItem: Item | null;
  buildStat: StatId;
  matchesBuild: boolean;
  itemTotalBonus: number;
  currentTotalBonus: number;
  totalDelta: number;
  buildStatDelta: number;
  statDeltas: StatBlock;
  improvesSlot: boolean;
};

export type ChoiceForecast = {
  stat: StatId;
  effectiveStat: number;
  baseDifficulty: number;
  difficulty: number;
  difficultyModifier: number;
  approach: EncounterOptionApproach;
  success: boolean;
  bossEncounter: boolean;
  statGainOnSuccess: number;
  healthLossOnFailure: number;
  wouldLoseOnFailure: boolean;
  bossRetriesOnFailure: boolean;
  completesLevelOnSuccess: boolean;
  completesLevelOnFailure: boolean;
  opensRewardOnSuccess: boolean;
  opensRewardOnFailure: boolean;
  winsOnSuccess: boolean;
};

const buildIdentities: Record<StatId, Omit<BuildIdentity, "stat">> = {
  agility: {
    archetype: "Rogue",
    label: "Rogue path",
    name: "Agility",
  },
  intellect: {
    archetype: "Strategist",
    label: "Strategist path",
    name: "Intellect",
  },
  spirit: {
    archetype: "Mystic",
    label: "Mystic path",
    name: "Spirit",
  },
  strength: {
    archetype: "Warrior",
    label: "Warrior path",
    name: "Strength",
  },
};

const approachDifficultyModifiers: Record<EncounterOptionApproach, number> = {
  favored: -1,
  standard: 0,
  strained: 2,
};

const categoryStatPriorities: Record<Encounter["category"], readonly StatId[]> = {
  boss: ["strength", "intellect", "agility", "spirit"],
  enemy: ["strength", "agility", "intellect", "spirit"],
  mystery: ["intellect", "spirit", "agility", "strength"],
  obstacle: ["strength", "agility", "intellect", "spirit"],
  social: ["intellect", "spirit", "agility", "strength"],
  survival: ["spirit", "agility", "strength", "intellect"],
};

const levelPurposes: Record<LevelPurposeId, LevelPurpose> = {
  boss: {
    description: "Defeat the gatekeeper. Failed boss checks cost more health and must be retried.",
    id: "boss",
    label: "Boss",
  },
  boss_prep: {
    description: "The next boss is close. Push your main stat or choose gear that closes the gap.",
    id: "boss_prep",
    label: "Boss prep",
  },
  build_up: {
    description: "Grow the stat your build depends on while avoiding strained checks that waste health.",
    id: "build_up",
    label: "Build-up",
  },
  complete: {
    description: "The run has ended.",
    id: "complete",
    label: "Complete",
  },
  final_boss: {
    description: "The final check of the build you made.",
    id: "final_boss",
    label: "Final boss",
  },
  training: {
    description: "Early levels are forgiving. Pick a direction and notice which approaches fit each encounter.",
    id: "training",
    label: "Training",
  },
};

export function createEmptyStatBlock(value = 0): StatBlock {
  return {
    agility: value,
    intellect: value,
    spirit: value,
    strength: value,
  };
}

export function getEquipmentBonuses(character: Character): StatBlock {
  const bonuses = createEmptyStatBlock();

  for (const slot of equipmentSlots) {
    const item = character.equipment[slot];
    if (!item) continue;

    for (const stat of statIds) {
      bonuses[stat] += item.bonuses[stat] ?? 0;
    }
  }

  return bonuses;
}

export function getEffectiveStats(character: Character): StatBlock {
  const equipmentBonuses = getEquipmentBonuses(character);

  return {
    agility: character.baseStats.agility + equipmentBonuses.agility,
    intellect: character.baseStats.intellect + equipmentBonuses.intellect,
    spirit: character.baseStats.spirit + equipmentBonuses.spirit,
    strength: character.baseStats.strength + equipmentBonuses.strength,
  };
}

export function getEffectiveStat(character: Character, stat: StatId): number {
  return getEffectiveStats(character)[stat];
}

export function getStrongestStat(character: Character): StatId {
  const effectiveStats = getEffectiveStats(character);
  let strongest: StatId = "strength";

  for (const stat of statIds) {
    if (effectiveStats[stat] > effectiveStats[strongest]) {
      strongest = stat;
    }
  }

  return strongest;
}

export function getBuildIdentity(character: Character): BuildIdentity {
  const stat = getStrongestStat(character);
  const identity = buildIdentities[stat];

  return {
    ...identity,
    stat,
  };
}

export function getCurrentAct(state: GameState): ActProgress {
  const bossLevels = getSortedBossLevels(state);
  const level = clampLevelForProgress(state);
  const actIndex = bossLevels.findIndex((bossLevel) => level <= bossLevel);
  const act = actIndex === -1 ? bossLevels.length + 1 : actIndex + 1;
  const startLevel = act === 1 ? 1 : (bossLevels[act - 2] ?? 0) + 1;
  const endLevel = bossLevels[act - 1] ?? state.config.maxLevel;
  const levelsInAct = Math.max(1, endLevel - startLevel + 1);
  const levelInAct = Math.min(levelsInAct, Math.max(1, level - startLevel + 1));

  return {
    act,
    endLevel,
    label: `Act ${act}`,
    level,
    levelInAct,
    levelsInAct,
    startLevel,
  };
}

export function getDistanceToNextBoss(state: GameState): number | null {
  const nextBossLevel = getNextBossLevel(state);

  if (nextBossLevel === null) {
    return null;
  }

  const progressLevel = state.phase === "reward" ? state.level + 1 : state.level;

  return Math.max(0, nextBossLevel - progressLevel);
}

export function getNextBossLevel(state: GameState): number | null {
  if (state.phase === "complete") {
    return null;
  }

  const nextUnclearedLevel = state.phase === "reward" ? state.level + 1 : state.level;

  return getSortedBossLevels(state).find((bossLevel) => bossLevel >= nextUnclearedLevel) ?? null;
}

export function getLevelPurpose(state: GameState): LevelPurpose {
  if (state.phase === "complete") {
    return levelPurposes.complete;
  }

  const plannedEncounter = state.phase === "encounter" ? getCurrentPlannedEncounter(state) : null;

  if (plannedEncounter?.source === "boss") {
    return state.level >= state.config.maxLevel ? levelPurposes.final_boss : levelPurposes.boss;
  }

  const distanceToNextBoss = getDistanceToNextBoss(state);

  if (distanceToNextBoss === 0 || distanceToNextBoss === 1) {
    return levelPurposes.boss_prep;
  }

  if (state.level <= 2) {
    return levelPurposes.training;
  }

  return levelPurposes.build_up;
}

export function getUnderbuiltStatus(
  state: GameState,
  stat: StatId = getStrongestStat(state.character),
): UnderbuiltStatus {
  const readiness = getBossReadiness(state);
  const distanceToNextBoss = getDistanceToNextBoss(state);

  if (!readiness) {
    return {
      effectiveStat: getEffectiveStat(state.character, stat),
      gap: 0,
      stat,
      targetDifficulty: null,
      underbuilt: false,
      urgent: false,
    };
  }

  const statReadiness = readiness.stats[stat];

  return {
    effectiveStat: statReadiness.effectiveStat,
    gap: statReadiness.gap,
    stat,
    targetDifficulty: readiness.difficulty,
    underbuilt: statReadiness.gap < 0,
    urgent: statReadiness.gap < 0 && distanceToNextBoss !== null && distanceToNextBoss <= 1,
  };
}

export function getPressureLevel(state: GameState): PressureLevel {
  const buildStat = getStrongestStat(state.character);
  const underbuilt = getUnderbuiltStatus(state, buildStat);
  const distanceToNextBoss = getDistanceToNextBoss(state);
  const healthRatio = state.character.health / state.character.maxHealth;

  if (state.status === "lost" || healthRatio <= 0.2 || underbuilt.urgent) {
    return "critical";
  }

  if (healthRatio <= 0.4 || (underbuilt.underbuilt && distanceToNextBoss !== null && distanceToNextBoss <= 2)) {
    return "high";
  }

  if (underbuilt.underbuilt || (distanceToNextBoss !== null && distanceToNextBoss <= 2)) {
    return "medium";
  }

  return "low";
}

export function getMilestoneStatus(state: GameState): MilestoneStatus {
  const nextBossLevel = getNextBossLevel(state);
  const bossEncounter = nextBossLevel === null ? null : getBossEncounterForLevel(state, nextBossLevel);

  return {
    distanceToNextBoss: getDistanceToNextBoss(state),
    levelPurpose: getLevelPurpose(state),
    nextBossLevel,
    nextBossTitle: bossEncounter?.encounter.title ?? null,
    pressure: getPressureLevel(state),
    underbuilt: getUnderbuiltStatus(state),
  };
}

export function getBossReadiness(state: GameState): BossReadiness | null {
  const bossLevel = getNextBossLevel(state);

  if (bossLevel === null) {
    return null;
  }

  const bossEncounter = getBossEncounterForLevel(state, bossLevel);
  const difficulty = getDifficultyValue(state.config, bossLevel, "boss");
  const effectiveStats = getEffectiveStats(state.character);
  const stats = {
    agility: createBossReadinessStat("agility", effectiveStats.agility, difficulty),
    intellect: createBossReadinessStat("intellect", effectiveStats.intellect, difficulty),
    spirit: createBossReadinessStat("spirit", effectiveStats.spirit, difficulty),
    strength: createBossReadinessStat("strength", effectiveStats.strength, difficulty),
  };

  return {
    bossLevel,
    bossTitle: bossEncounter?.encounter.title ?? `Level ${bossLevel} boss`,
    difficulty,
    stats,
  };
}

export function getRunSummary(state: GameState): RunSummary {
  const choiceEntries = state.history.filter((entry) => entry.type === "choice" && entry.outcome);
  const choiceCounts = createEmptyStatBlock();
  const successCounts = createEmptyStatBlock();
  const failureCounts = createEmptyStatBlock();
  let successes = 0;
  let failures = 0;
  let bossFailures = 0;
  let bossesDefeated = 0;
  let levelsCleared = 0;

  for (const entry of choiceEntries) {
    const outcome = entry.outcome!;
    choiceCounts[outcome.statUsed] += 1;

    if (outcome.success) {
      successes += 1;
      successCounts[outcome.statUsed] += 1;
    } else {
      failures += 1;
      failureCounts[outcome.statUsed] += 1;
    }

    if (outcome.bossEncounter && !outcome.success) {
      bossFailures += 1;
    }

    if (outcome.bossDefeated) {
      bossesDefeated += 1;
    }

    if (outcome.completedLevel) {
      levelsCleared += 1;
    }
  }

  const totalChoices = choiceEntries.length;
  const dominantStat = getDominantStat(choiceCounts);

  return {
    bossesDefeated,
    bossFailures,
    buildConsistency: totalChoices === 0 ? 0 : choiceCounts[dominantStat] / totalChoices,
    choiceCounts,
    chosenStatsCount: statIds.filter((stat) => choiceCounts[stat] > 0).length,
    dominantStat,
    failureCounts,
    failures,
    levelsCleared,
    successCounts,
    successes,
    totalChoices,
  };
}

export function getLevelRunSummary(state: GameState, level: number): LevelRunSummary {
  const choiceEntries = state.history.filter(
    (entry) => entry.type === "choice" && entry.level === level && entry.outcome,
  );
  const choiceCounts = createEmptyStatBlock();
  let successes = 0;
  let failures = 0;
  let bossFailures = 0;
  let bossDefeated = false;

  for (const entry of choiceEntries) {
    const outcome = entry.outcome!;
    choiceCounts[outcome.statUsed] += 1;

    if (outcome.success) {
      successes += 1;
    } else {
      failures += 1;
    }

    if (outcome.bossEncounter && !outcome.success) {
      bossFailures += 1;
    }

    if (outcome.bossDefeated) {
      bossDefeated = true;
    }
  }

  return {
    bossDefeated,
    bossFailures,
    choiceCounts,
    dominantStat: getDominantStat(choiceCounts),
    failures,
    level,
    successes,
    totalChoices: choiceEntries.length,
  };
}

function createBossReadinessStat(
  stat: StatId,
  effectiveStat: number,
  difficulty: number,
): BossReadinessStat {
  return {
    difficulty,
    effectiveStat,
    gap: effectiveStat - difficulty,
    ready: effectiveStat >= difficulty,
    stat,
  };
}

export function getChoiceForecast(state: GameState, stat: StatId): ChoiceForecast {
  const plannedEncounter = getCurrentPlannedEncounter(state);
  const encounter = plannedEncounter.encounter;
  const bossEncounter = plannedEncounter.source === "boss" || encounter.difficulty === "boss";
  const baseDifficulty = getDifficultyValue(state.config, state.level, encounter.difficulty);
  const optionFit = getEncounterOptionFit(encounter, stat);
  const difficulty = getOptionDifficultyValue(state.config, state.level, encounter, stat);
  const effectiveStat = getEffectiveStat(state.character, stat);
  const success = effectiveStat >= difficulty;
  const statGainOnSuccess = bossEncounter
    ? state.config.result.bossSuccessStatGain
    : state.config.result.normalSuccessStatGain;
  const healthLossOnFailure = bossEncounter
    ? state.config.result.bossFailureDamage
    : state.config.result.normalFailureDamage;
  const finalEncounterInLevel = isFinalEncounterInLevel(state);
  const wouldLoseOnFailure = state.character.health <= healthLossOnFailure;
  const completesLevelOnSuccess = finalEncounterInLevel;
  const completesLevelOnFailure = !bossEncounter && finalEncounterInLevel;

  return {
    bossEncounter,
    bossRetriesOnFailure: bossEncounter && !wouldLoseOnFailure,
    completesLevelOnFailure,
    completesLevelOnSuccess,
    approach: optionFit.approach,
    baseDifficulty,
    difficulty,
    difficultyModifier: optionFit.difficultyModifier,
    effectiveStat,
    healthLossOnFailure,
    opensRewardOnFailure: completesLevelOnFailure && state.level < state.config.maxLevel,
    opensRewardOnSuccess: completesLevelOnSuccess && state.level < state.config.maxLevel,
    stat,
    statGainOnSuccess,
    success,
    winsOnSuccess: completesLevelOnSuccess && state.level >= state.config.maxLevel,
    wouldLoseOnFailure,
  };
}

export function getRewardComparison(
  character: Character,
  rewardOrItem: RewardChoice | Item,
  buildStat: StatId = getStrongestStat(character),
): RewardComparison {
  const reward = "item" in rewardOrItem ? rewardOrItem : null;
  const item = "item" in rewardOrItem ? rewardOrItem.item : rewardOrItem;
  const slotItem = character.equipment[item.slot];
  const itemTotalBonus = getTotalItemBonus(item);
  const currentTotalBonus = getTotalItemBonus(slotItem);
  const statDeltas = createEmptyStatBlock();

  for (const stat of statIds) {
    statDeltas[stat] = (item.bonuses[stat] ?? 0) - (slotItem?.bonuses[stat] ?? 0);
  }

  return {
    buildStat,
    buildStatDelta: statDeltas[buildStat],
    currentTotalBonus,
    improvesSlot: itemTotalBonus > currentTotalBonus,
    item,
    itemTotalBonus,
    matchesBuild: (item.bonuses[buildStat] ?? 0) > 0,
    reward,
    slotItem,
    statDeltas,
    totalDelta: itemTotalBonus - currentTotalBonus,
  };
}

export function getLevelPlan(state: GameState): LevelPlan {
  const levelPlan = state.plan.levels[state.level - 1];

  if (!levelPlan) {
    throw new Error(`No level plan found for level ${state.level}.`);
  }

  return levelPlan;
}

export function getCurrentPlannedEncounter(state: GameState): PlannedEncounter {
  const levelPlan = getLevelPlan(state);
  const plannedEncounter = levelPlan.encounters[state.encounterIndex];

  if (!plannedEncounter) {
    throw new Error(
      `No encounter found for level ${state.level}, index ${state.encounterIndex}.`,
    );
  }

  return plannedEncounter;
}

export function getCurrentEncounter(state: GameState): Encounter {
  return getCurrentPlannedEncounter(state).encounter;
}

export function getEncounterOptionFit(
  encounter: Encounter,
  stat: StatId,
): {
  approach: EncounterOptionApproach;
  difficultyModifier: number;
} {
  const option = encounter.options[stat];
  const explicitApproach = option.approach;

  if (typeof option.difficultyModifier === "number") {
    return {
      approach: explicitApproach ?? getApproachForModifier(option.difficultyModifier),
      difficultyModifier: option.difficultyModifier,
    };
  }

  if (explicitApproach) {
    return {
      approach: explicitApproach,
      difficultyModifier: approachDifficultyModifiers[explicitApproach],
    };
  }

  if (encounter.category === "boss") {
    return {
      approach: "standard",
      difficultyModifier: 0,
    };
  }

  const approach = getDerivedOptionApproach(encounter, stat);

  return {
    approach,
    difficultyModifier: approachDifficultyModifiers[approach],
  };
}

export function getOptionDifficultyValue(
  config: GameConfig,
  level: number,
  encounter: Encounter,
  stat: StatId,
): number {
  const baseDifficulty = getDifficultyValue(config, level, encounter.difficulty);
  const { difficultyModifier } = getEncounterOptionFit(encounter, stat);

  return Math.max(1, baseDifficulty + difficultyModifier);
}

export function getDifficultyValue(
  config: GameConfig,
  level: number,
  difficulty: EncounterDifficulty,
): number {
  if (difficulty === "boss") {
    return level + config.difficulty.bossOffset;
  }

  if (difficulty === "hard") {
    return level + config.difficulty.hardOffset;
  }

  return level + config.difficulty.normalOffset;
}

function getApproachForModifier(modifier: number): EncounterOptionApproach {
  if (modifier < 0) return "favored";
  if (modifier > 0) return "strained";

  return "standard";
}

function getDerivedOptionApproach(
  encounter: Encounter,
  stat: StatId,
): EncounterOptionApproach {
  const priorities = categoryStatPriorities[encounter.category];
  const primaryStats = priorities.slice(0, 2);
  const strainedStats = priorities.slice(2);
  const hash = hashStableText(encounter.id);
  const favoredStat = primaryStats[hash % primaryStats.length]!;
  const strainedStat = strainedStats[Math.floor(hash / primaryStats.length) % strainedStats.length]!;

  if (stat === favoredStat) {
    return "favored";
  }

  if (stat === strainedStat) {
    return "strained";
  }

  return "standard";
}

function hashStableText(text: string): number {
  let hash = 2166136261;

  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getSortedBossLevels(state: GameState): number[] {
  return [...state.config.bossLevels].sort((first, second) => first - second);
}

function clampLevelForProgress(state: GameState): number {
  return Math.max(1, Math.min(state.level, state.config.maxLevel));
}

function getBossEncounterForLevel(state: GameState, bossLevel: number): PlannedEncounter | null {
  const levelPlan = state.plan.levels[bossLevel - 1];

  return levelPlan?.encounters.find((planned) => planned.source === "boss") ?? null;
}

function isFinalEncounterInLevel(state: GameState): boolean {
  const levelPlan = getLevelPlan(state);

  return state.encounterIndex >= levelPlan.encounters.length - 1;
}

function getTotalItemBonus(item: Item | null): number {
  if (!item) return 0;

  return Object.values(item.bonuses).reduce((total, bonus) => total + (bonus ?? 0), 0);
}

function getDominantStat(choiceCounts: StatBlock): StatId {
  let dominant: StatId = "strength";

  for (const stat of statIds) {
    if (choiceCounts[stat] > choiceCounts[dominant]) {
      dominant = stat;
    }
  }

  return dominant;
}
