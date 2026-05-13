import type { GameConfig } from "./config";

export const statIds = ["strength", "intellect", "agility", "spirit"] as const;

export type StatId = (typeof statIds)[number];

export type StatBlock = Record<StatId, number>;

export const equipmentSlots = ["weapon", "armor", "trinket"] as const;

export type EquipmentSlot = (typeof equipmentSlots)[number];

export type Equipment = Record<EquipmentSlot, Item | null>;

export type Item = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  bonuses: Partial<StatBlock>;
  tier: number;
  description: string;
  tags?: string[];
};

export type EncounterCategory =
  | "obstacle"
  | "enemy"
  | "social"
  | "mystery"
  | "survival"
  | "boss";

export type EncounterDifficulty = "normal" | "hard" | "boss";

export type EncounterOptionApproach = "favored" | "standard" | "strained";

export type EncounterOption = {
  stat: StatId;
  label: string;
  description: string;
  approach?: EncounterOptionApproach;
  difficultyModifier?: number;
};

export type Encounter = {
  id: string;
  title: string;
  category: EncounterCategory;
  description: string;
  difficulty: EncounterDifficulty;
  options: Record<StatId, EncounterOption>;
};

export type GameStory = {
  title: string;
  subtitle: string;
  intro: string;
  actIntros: Record<number, {
    title: string;
    description: string;
  }>;
  levelClearedTitle: string;
  levelClearedDescription: string;
  bossDefeatedTitle: string;
  bossDefeatedDescription: string;
  victoryTitle: string;
  victoryDescription: string;
  defeatTitle: string;
  defeatDescription: string;
};

export type GameContent = {
  story: GameStory;
  fixedEncounters: Record<number, Encounter>;
  randomEncounters: Encounter[];
  bossEncounters: Record<number, Encounter>;
  items: Item[];
};

export type PlannedEncounterSource = "fixed" | "random" | "boss";

export type PlannedEncounter = {
  level: number;
  slot: number;
  source: PlannedEncounterSource;
  encounter: Encounter;
};

export type LevelPlan = {
  level: number;
  isBossLevel: boolean;
  encounters: PlannedEncounter[];
};

export type RunPlan = {
  seed: string;
  levels: LevelPlan[];
};

export type Character = {
  health: number;
  maxHealth: number;
  baseStats: StatBlock;
  inventory: Item[];
  equipment: Equipment;
};

export type RewardReason = "strongest_stat" | "random" | "mixed";

export type RewardChoice = {
  id: string;
  level: number;
  item: Item;
  reason: RewardReason;
  tier: number;
};

export type RunStatus = "not_started" | "playing" | "reward" | "won" | "lost";

export type GamePhase = "encounter" | "reward" | "complete";

export type GameHistoryEntryType = "choice" | "reward";

export type GameHistoryOutcome = {
  statUsed: StatId;
  success: boolean;
  bossEncounter: boolean;
  bossDefeated: boolean;
  completedLevel: boolean;
  gameEnded: boolean;
  healthDelta: number;
  statGain: number;
};

export type GameHistoryEntry = {
  id: string;
  type?: GameHistoryEntryType;
  level: number;
  encounterIndex: number;
  text: string;
  outcome?: GameHistoryOutcome;
  rewardItemId?: string;
};

export type GameState = {
  seed: string;
  config: GameConfig;
  status: RunStatus;
  phase: GamePhase;
  level: number;
  encounterIndex: number;
  plan: RunPlan;
  pendingRewards: RewardChoice[];
  character: Character;
  history: GameHistoryEntry[];
};
