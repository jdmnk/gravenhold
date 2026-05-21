export const statIds = ["strength", "intellect", "agility", "spirit"] as const;
export type StatId = (typeof statIds)[number];

export const statLabels: Record<StatId, string> = {
  agility: "Agility",
  intellect: "Intellect",
  spirit: "Spirit",
  strength: "Strength",
};

export const statShortLabels: Record<StatId, string> = {
  agility: "AGI",
  intellect: "INT",
  spirit: "SPI",
  strength: "STR",
};

export const equipmentSlots = ["weapon", "armor", "trinket"] as const;
export type EquipmentSlot = (typeof equipmentSlots)[number];

export const slotLabels: Record<EquipmentSlot, string> = {
  armor: "Armor",
  trinket: "Trinket",
  weapon: "Weapon",
};

export type RunStatus = "not_started" | "playing" | "reward" | "won" | "lost";
export type GamePhase = "encounter" | "reward" | "stat_allocate" | "complete";
export type EncounterSource = "fixed" | "random" | "boss";
export type EncounterCategory = "obstacle" | "enemy" | "social" | "mystery" | "survival" | "boss";
export type EncounterDifficulty = "normal" | "hard" | "boss";
export type EncounterApproach = "favored" | "standard" | "strained";
export type RewardReason = "strongest_stat" | "random" | "mixed";
export type DeltaSign = "zero" | "positive" | "negative";

export type RunView = {
  id: bigint;
  player: string;
  seed: bigint;
  nonce: number;
  status: RunStatus;
  phase: GamePhase;
  pendingPhase: GamePhase;
  level: number;
  encounterIndex: number;
  choiceCount: number;
  rewardCount: number;
  startedAt: bigint;
  endedAt: bigint;
};

export type CharacterView = {
  runId: bigint;
  health: number;
  maxHealth: number;
  xpLevel: number;
  xp: number;
  unspentStatPoints: number;
  baseStats: Record<StatId, number>;
  strain: Record<StatId, number>;
  equipment: Record<EquipmentSlot, number>;
  inventoryBits: bigint;
};

export type CurrentEncounterView = {
  level: number;
  encounterIndex: number;
  encounterId: number;
  source: EncounterSource;
  category: EncounterCategory;
  difficultyKind: EncounterDifficulty;
  baseDifficulty: number;
};

export type ChoiceForecastView = {
  stat: StatId;
  effectiveStat: number;
  baseDifficulty: number;
  difficulty: number;
  difficultyModifierSign: DeltaSign;
  difficultyModifierAmount: number;
  approach: EncounterApproach;
  success: boolean;
  bossEncounter: boolean;
  statGainOnSuccess: number;
  healthLossOnFailure: number;
  wouldLoseOnFailure: boolean;
  bossRetriesOnFailure: boolean;
  completedLevelOnSuccess: boolean;
  opensRewardOnSuccess: boolean;
  winsOnSuccess: boolean;
  strainBefore: number;
  strainDifficultyAmount: number;
  bossSupportRequired: number;
  bossSupportValue: number;
  bossSupportDifficultyAmount: number;
  bossSupportDamageAmount: number;
  statGainBlockedByStrain: boolean;
};

export type ChoiceLogView = {
  runId: bigint;
  index: number;
  level: number;
  encounterIndex: number;
  encounterId: number;
  stat: StatId;
  success: boolean;
  effectiveStat: number;
  baseDifficulty: number;
  difficulty: number;
  difficultyModifierSign: DeltaSign;
  difficultyModifierAmount: number;
  healthDeltaSign: DeltaSign;
  healthDeltaAmount: number;
  statGain: number;
  xpGain: number;
  xpLevelAfter: number;
  leveledUp: boolean;
  bossEncounter: boolean;
  bossDefeated: boolean;
  completedLevel: boolean;
  gameEnded: boolean;
};

export type RewardOfferView = {
  runId: bigint;
  index: number;
  level: number;
  itemId: number;
  reason: RewardReason;
  tier: number;
  active: boolean;
};

export type RewardLogView = {
  runId: bigint;
  index: number;
  level: number;
  itemId: number;
  equipped: boolean;
};

export type ItemView = {
  itemId: number;
  exists: boolean;
  slot: EquipmentSlot;
  tier: number;
  bonuses: Record<StatId, number>;
};

export type RunBundle = {
  run: RunView;
  character: CharacterView;
  currentEncounter: CurrentEncounterView | null;
  forecasts: Record<StatId, ChoiceForecastView> | null;
  items: Record<number, ItemView>;
  rewards: RewardOfferView[];
  recentChoices: ChoiceLogView[];
};

const statusMap: Record<number, RunStatus> = {
  0: "not_started",
  1: "playing",
  2: "reward",
  3: "won",
  4: "lost",
};

const phaseMap: Record<number, GamePhase> = {
  0: "encounter",
  1: "reward",
  2: "complete",
  3: "stat_allocate",
};

const sourceMap: Record<number, EncounterSource> = {
  0: "fixed",
  1: "random",
  2: "boss",
};

const categoryMap: Record<number, EncounterCategory> = {
  0: "obstacle",
  1: "enemy",
  2: "social",
  3: "mystery",
  4: "survival",
  5: "boss",
};

const difficultyMap: Record<number, EncounterDifficulty> = {
  0: "normal",
  1: "hard",
  2: "boss",
};

const statMap: Record<number, StatId> = {
  0: "strength",
  1: "intellect",
  2: "agility",
  3: "spirit",
};

const slotMap: Record<number, EquipmentSlot> = {
  0: "weapon",
  1: "armor",
  2: "trinket",
};

export const statToChainId: Record<StatId, number> = {
  agility: 2,
  intellect: 1,
  spirit: 3,
  strength: 0,
};

const approachMap: Record<number, EncounterApproach> = {
  0: "favored",
  1: "standard",
  2: "strained",
};

const reasonMap: Record<number, RewardReason> = {
  0: "strongest_stat",
  1: "random",
  2: "mixed",
};

const deltaSignMap: Record<number, DeltaSign> = {
  0: "zero",
  1: "positive",
  2: "negative",
};

function felt(felts: string[], index: number): bigint {
  const value = felts[index];
  if (value === undefined) {
    throw new Error(`Missing felt at index ${index}.`);
  }
  return BigInt(value);
}

function num(felts: string[], index: number): number {
  return Number(felt(felts, index));
}

function bool(felts: string[], index: number): boolean {
  return felt(felts, index) !== BigInt(0);
}

function enumValue<T>(map: Record<number, T>, value: number, label: string): T {
  const decoded = map[value];
  if (!decoded) {
    throw new Error(`Unknown ${label}: ${value}`);
  }
  return decoded;
}

export function decodeRun(felts: string[]): RunView {
  return {
    id: felt(felts, 0),
    player: felts[1] ?? "0x0",
    seed: felt(felts, 2),
    nonce: num(felts, 3),
    status: enumValue(statusMap, num(felts, 4), "run status"),
    phase: enumValue(phaseMap, num(felts, 5), "phase"),
    pendingPhase: enumValue(phaseMap, num(felts, 6), "pending phase"),
    level: num(felts, 7),
    encounterIndex: num(felts, 8),
    choiceCount: num(felts, 9),
    rewardCount: num(felts, 10),
    startedAt: felt(felts, 11),
    endedAt: felt(felts, 12),
  };
}

export function decodeCharacter(felts: string[]): CharacterView {
  return {
    runId: felt(felts, 0),
    health: num(felts, 1),
    maxHealth: num(felts, 2),
    xpLevel: num(felts, 3),
    xp: num(felts, 4),
    unspentStatPoints: num(felts, 5),
    baseStats: {
      strength: num(felts, 6),
      intellect: num(felts, 7),
      agility: num(felts, 8),
      spirit: num(felts, 9),
    },
    strain: {
      strength: num(felts, 10),
      intellect: num(felts, 11),
      agility: num(felts, 12),
      spirit: num(felts, 13),
    },
    equipment: {
      weapon: num(felts, 14),
      armor: num(felts, 15),
      trinket: num(felts, 16),
    },
    inventoryBits: felt(felts, 17),
  };
}

export function decodeCurrentEncounter(felts: string[]): CurrentEncounterView {
  return {
    level: num(felts, 0),
    encounterIndex: num(felts, 1),
    encounterId: num(felts, 2),
    source: enumValue(sourceMap, num(felts, 3), "encounter source"),
    category: enumValue(categoryMap, num(felts, 4), "encounter category"),
    difficultyKind: enumValue(difficultyMap, num(felts, 5), "difficulty"),
    baseDifficulty: num(felts, 6),
  };
}

export function decodeChoiceForecast(felts: string[]): ChoiceForecastView {
  return {
    stat: enumValue(statMap, num(felts, 0), "stat"),
    effectiveStat: num(felts, 1),
    baseDifficulty: num(felts, 2),
    difficulty: num(felts, 3),
    difficultyModifierSign: enumValue(deltaSignMap, num(felts, 4), "difficulty sign"),
    difficultyModifierAmount: num(felts, 5),
    approach: enumValue(approachMap, num(felts, 6), "approach"),
    success: bool(felts, 7),
    bossEncounter: bool(felts, 8),
    statGainOnSuccess: num(felts, 9),
    healthLossOnFailure: num(felts, 10),
    wouldLoseOnFailure: bool(felts, 11),
    bossRetriesOnFailure: bool(felts, 12),
    completedLevelOnSuccess: bool(felts, 13),
    opensRewardOnSuccess: bool(felts, 14),
    winsOnSuccess: bool(felts, 15),
    strainBefore: num(felts, 16),
    strainDifficultyAmount: num(felts, 17),
    bossSupportRequired: num(felts, 18),
    bossSupportValue: num(felts, 19),
    bossSupportDifficultyAmount: num(felts, 20),
    bossSupportDamageAmount: num(felts, 21),
    statGainBlockedByStrain: bool(felts, 22),
  };
}

export function decodeChoiceLog(felts: string[]): ChoiceLogView {
  return {
    runId: felt(felts, 0),
    index: num(felts, 1),
    level: num(felts, 2),
    encounterIndex: num(felts, 3),
    encounterId: num(felts, 4),
    stat: enumValue(statMap, num(felts, 5), "stat"),
    success: bool(felts, 6),
    effectiveStat: num(felts, 7),
    baseDifficulty: num(felts, 8),
    difficulty: num(felts, 9),
    difficultyModifierSign: enumValue(deltaSignMap, num(felts, 10), "difficulty sign"),
    difficultyModifierAmount: num(felts, 11),
    healthDeltaSign: enumValue(deltaSignMap, num(felts, 12), "health sign"),
    healthDeltaAmount: num(felts, 13),
    statGain: num(felts, 14),
    xpGain: num(felts, 15),
    xpLevelAfter: num(felts, 16),
    leveledUp: bool(felts, 17),
    bossEncounter: bool(felts, 18),
    bossDefeated: bool(felts, 19),
    completedLevel: bool(felts, 20),
    gameEnded: bool(felts, 21),
  };
}

export function decodeRewardOffer(felts: string[]): RewardOfferView {
  return {
    runId: felt(felts, 0),
    index: num(felts, 1),
    level: num(felts, 2),
    itemId: num(felts, 3),
    reason: enumValue(reasonMap, num(felts, 4), "reward reason"),
    tier: num(felts, 5),
    active: bool(felts, 6),
  };
}

export function decodeRewardLog(felts: string[]): RewardLogView {
  return {
    runId: felt(felts, 0),
    index: num(felts, 1),
    level: num(felts, 2),
    itemId: num(felts, 3),
    equipped: bool(felts, 4),
  };
}

export function decodeItem(felts: string[]): ItemView {
  return {
    itemId: num(felts, 0),
    exists: bool(felts, 1),
    slot: enumValue(slotMap, num(felts, 2), "equipment slot"),
    tier: num(felts, 3),
    bonuses: {
      strength: num(felts, 4),
      intellect: num(felts, 5),
      agility: num(felts, 6),
      spirit: num(felts, 7),
    },
  };
}

export function inventoryItemIds(bits: bigint): number[] {
  const ids: number[] = [];
  for (let itemId = 1; itemId <= 64; itemId += 1) {
    const mask = BigInt(1) << BigInt(itemId - 1);
    if ((bits & mask) !== BigInt(0)) {
      ids.push(itemId);
    }
  }
  return ids;
}

export function formatDelta(sign: DeltaSign, amount: number): string {
  if (sign === "positive") return `+${amount}`;
  if (sign === "negative") return `-${amount}`;
  return "0";
}
