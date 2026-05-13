import type { GameState, StatBlock } from "./types";

export type DifficultyConfig = {
  normalOffset: number;
  hardOffset: number;
  bossOffset: number;
};

export type RewardConfig = {
  choicesPerLevel: number;
  bossTierBonus: number;
};

export type ResultConfig = {
  normalFailureDamage: number;
  bossFailureDamage: number;
  normalSuccessStatGain: number;
  bossSuccessStatGain: number;
  bossVictoryHeal: number;
};

export type GameConfig = {
  maxLevel: number;
  encountersPerLevel: number;
  bossLevels: number[];
  startingHealth: number;
  startingStats: StatBlock;
  difficulty: DifficultyConfig;
  rewards: RewardConfig;
  result: ResultConfig;
};

export const defaultStartingStats: StatBlock = {
  agility: 2,
  intellect: 2,
  spirit: 2,
  strength: 2,
};

export const defaultGameConfig: GameConfig = {
  bossLevels: [5, 10, 15, 20],
  difficulty: {
    bossOffset: 4,
    hardOffset: 3,
    normalOffset: 1,
  },
  encountersPerLevel: 3,
  maxLevel: 20,
  result: {
    bossFailureDamage: 2,
    bossSuccessStatGain: 2,
    bossVictoryHeal: 2,
    normalFailureDamage: 1,
    normalSuccessStatGain: 1,
  },
  rewards: {
    bossTierBonus: 1,
    choicesPerLevel: 3,
  },
  startingHealth: 10,
  startingStats: defaultStartingStats,
};

export type CreateGameOptions = {
  config?: PartialGameConfig;
};

export type PartialGameConfig = Partial<
  Omit<GameConfig, "difficulty" | "rewards" | "result" | "startingStats">
> & {
  difficulty?: Partial<DifficultyConfig>;
  rewards?: Partial<RewardConfig>;
  result?: Partial<ResultConfig>;
  startingStats?: Partial<StatBlock>;
};

export function mergeGameConfig(partial: PartialGameConfig = {}): GameConfig {
  return {
    ...defaultGameConfig,
    ...partial,
    bossLevels: partial.bossLevels ?? defaultGameConfig.bossLevels,
    difficulty: {
      ...defaultGameConfig.difficulty,
      ...partial.difficulty,
    },
    result: {
      ...defaultGameConfig.result,
      ...partial.result,
    },
    rewards: {
      ...defaultGameConfig.rewards,
      ...partial.rewards,
    },
    startingStats: {
      ...defaultGameConfig.startingStats,
      ...partial.startingStats,
    },
  };
}

export function createGameStateConfigSnapshot(state: GameState, config: GameConfig) {
  return {
    bossLevels: config.bossLevels,
    encountersPerLevel: config.encountersPerLevel,
    level: state.level,
    maxLevel: config.maxLevel,
    seed: state.seed,
  };
}
