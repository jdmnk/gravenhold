import {
  chooseReward as chooseGameReward,
  createInitialGame,
  equipItem,
  resolveChoice,
  type ChoiceOutcome,
} from "./engine";
import { createRng, type Rng } from "./rng";
import { createEmptyStatBlock, getEffectiveStats, getStrongestStat } from "./selectors";
import type { PartialGameConfig } from "./config";
import type {
  GameContent,
  GameState,
  Item,
  RewardChoice,
  StatBlock,
  StatId,
} from "./types";
import { statIds } from "./types";

export type SimulationStrategy = {
  id: string;
  chooseStat: (state: GameState) => StatId;
  chooseReward?: (state: GameState) => RewardChoice;
  shouldEquip?: (state: GameState, item: Item) => boolean;
};

export type SimulationResult = {
  seed: string;
  strategyId: string;
  state: GameState;
  encounterCount: number;
  rewardCount: number;
  successes: number;
  failures: number;
  bossFailures: number;
  failedLevels: number[];
  bossFailureLevels: number[];
  choiceCounts: StatBlock;
};

export type SimulationStrategyFactory = (seed: string) => SimulationStrategy;

export type SimulationBatchSummary = {
  strategyId: string;
  seedCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  averageRemainingHealth: number;
  averageFailures: number;
  averageBossFailures: number;
  averageEncounterCount: number;
  averageRewardCount: number;
  failedLevels: Record<number, number>;
  choiceCounts: StatBlock;
  results: SimulationResult[];
};

export type SimulateGameOptions = {
  seed: string;
  strategy: SimulationStrategy;
  config?: PartialGameConfig;
  content?: GameContent;
  maxSteps?: number;
};

export function simulateGame(options: SimulateGameOptions): SimulationResult {
  const maxSteps = options.maxSteps ?? 500;
  let state = createInitialGame(options.seed, {
    config: options.config,
    content: options.content,
  });
  const outcomes: ChoiceOutcome[] = [];
  const rewards: RewardChoice[] = [];
  const choiceCounts = createEmptyStatBlock();
  let steps = 0;

  while (state.phase !== "complete") {
    if (steps >= maxSteps) {
      throw new Error(`Simulation exceeded ${maxSteps} steps.`);
    }

    steps += 1;

    if (state.phase === "encounter") {
      const stat = options.strategy.chooseStat(state);
      choiceCounts[stat] += 1;

      const result = resolveChoice(state, stat, {
        content: options.content,
      });
      outcomes.push(result.outcome);
      state = result.state;
      continue;
    }

    if (state.phase === "reward") {
      const reward = (options.strategy.chooseReward ?? chooseHighestTotalReward)(state);
      const result = chooseGameReward(state, reward.id);
      rewards.push(result.reward);
      state = result.state;

      if ((options.strategy.shouldEquip ?? shouldEquipIfImprovesTotal)(state, reward.item)) {
        state = equipItem(state, reward.item.id).state;
      }

      continue;
    }

    throw new Error(`Unsupported simulation phase: ${state.phase}`);
  }

  return {
    bossFailures: outcomes.filter((outcome) => outcome.bossEncounter && !outcome.success).length,
    bossFailureLevels: outcomes
      .filter((outcome) => outcome.bossEncounter && !outcome.success)
      .map((outcome) => outcome.level),
    choiceCounts,
    encounterCount: outcomes.length,
    failedLevels: outcomes.filter((outcome) => !outcome.success).map((outcome) => outcome.level),
    failures: outcomes.filter((outcome) => !outcome.success).length,
    rewardCount: rewards.length,
    seed: options.seed,
    state,
    strategyId: options.strategy.id,
    successes: outcomes.filter((outcome) => outcome.success).length,
  };
}

export type SimulateStrategyBatchOptions = {
  seeds: readonly string[];
  strategy: SimulationStrategy | SimulationStrategyFactory;
  config?: PartialGameConfig;
  content?: GameContent;
  maxSteps?: number;
};

export function simulateStrategyBatch(options: SimulateStrategyBatchOptions): SimulationBatchSummary {
  if (options.seeds.length === 0) {
    throw new Error("Simulation batch requires at least one seed.");
  }

  const results = options.seeds.map((seed) =>
    simulateGame({
      config: options.config,
      content: options.content,
      maxSteps: options.maxSteps,
      seed,
      strategy: createStrategyForSeed(options.strategy, seed),
    }),
  );
  const firstResult = results[0]!;
  const winCount = results.filter((result) => result.state.status === "won").length;
  const failedLevels = countLevels(results.flatMap((result) => result.failedLevels));
  const choiceCounts = sumChoiceCounts(results.map((result) => result.choiceCounts));

  return {
    averageBossFailures: average(results.map((result) => result.bossFailures)),
    averageEncounterCount: average(results.map((result) => result.encounterCount)),
    averageFailures: average(results.map((result) => result.failures)),
    averageRemainingHealth: average(results.map((result) => result.state.character.health)),
    averageRewardCount: average(results.map((result) => result.rewardCount)),
    choiceCounts,
    failedLevels,
    lossCount: results.length - winCount,
    results,
    seedCount: results.length,
    strategyId: firstResult.strategyId,
    winCount,
    winRate: winCount / results.length,
  };
}

export function createFocusedStrategy(stat: StatId): SimulationStrategy {
  return {
    chooseReward(state) {
      return chooseBestRewardForStat(state, stat);
    },
    chooseStat: () => stat,
    id: `focused_${stat}`,
    shouldEquip(state, item) {
      return scoreItemForStat(item, stat) > scoreItemForStat(state.character.equipment[item.slot], stat);
    },
  };
}

export function createSeededRandomStrategy(seed: string): SimulationStrategy {
  const rng = createRng(`${seed}:strategy:random`);

  return {
    chooseReward(state) {
      return pickRandomReward(state, rng);
    },
    chooseStat: () => rng.pick(statIds),
    id: "seeded_random",
    shouldEquip() {
      return rng.next() >= 0.5;
    },
  };
}

export function createCyclicStatStrategy(order: readonly StatId[] = statIds): SimulationStrategy {
  if (order.length === 0) {
    throw new Error("Cyclic strategy requires at least one stat.");
  }

  let index = 0;

  return {
    chooseReward: chooseHighestTotalReward,
    chooseStat() {
      const stat = order[index % order.length]!;
      index += 1;
      return stat;
    },
    id: `cyclic_${order.join("_")}`,
  };
}

export const highestEffectiveStatStrategy: SimulationStrategy = {
  chooseReward(state) {
    return chooseBestRewardForStat(state, getStrongestStat(state.character));
  },
  chooseStat(state) {
    return getStrongestStat(state.character);
  },
  id: "highest_effective_stat",
  shouldEquip(state, item) {
    const strongestStat = getStrongestStat(state.character);
    return (
      scoreItemForStat(item, strongestStat) >
      scoreItemForStat(state.character.equipment[item.slot], strongestStat)
    );
  },
};

export function chooseBestRewardForStat(state: GameState, stat: StatId): RewardChoice {
  return chooseBestReward(state, (reward) => scoreItemForStat(reward.item, stat));
}

export function chooseHighestTotalReward(state: GameState): RewardChoice {
  return chooseBestReward(state, (reward) => getTotalItemBonus(reward.item));
}

function createStrategyForSeed(
  strategy: SimulationStrategy | SimulationStrategyFactory,
  seed: string,
): SimulationStrategy {
  if (typeof strategy === "function") {
    return strategy(seed);
  }

  return strategy;
}

function pickRandomReward(state: GameState, rng: Rng): RewardChoice {
  if (state.pendingRewards.length === 0) {
    throw new Error("No pending rewards are available.");
  }

  return rng.pick(state.pendingRewards);
}

function chooseBestReward(state: GameState, score: (reward: RewardChoice) => number): RewardChoice {
  const [firstReward] = state.pendingRewards;

  if (!firstReward) {
    throw new Error("No pending rewards are available.");
  }

  return state.pendingRewards.reduce((best, reward) => {
    const rewardScore = score(reward);
    const bestScore = score(best);

    if (rewardScore > bestScore) {
      return reward;
    }

    if (rewardScore === bestScore && reward.item.tier > best.item.tier) {
      return reward;
    }

    return best;
  }, firstReward);
}

function shouldEquipIfImprovesTotal(state: GameState, item: Item): boolean {
  return getTotalItemBonus(item) > getTotalItemBonus(state.character.equipment[item.slot]);
}

function scoreItemForStat(item: Item | null, stat: StatId): number {
  if (!item) return 0;

  return (item.bonuses[stat] ?? 0) * 100 + getTotalItemBonus(item) * 10 + item.tier;
}

function getTotalItemBonus(item: Item | null): number {
  if (!item) return 0;

  return Object.values(item.bonuses).reduce((total, bonus) => total + (bonus ?? 0), 0);
}

export function getSimulationEffectiveStats(result: SimulationResult) {
  return getEffectiveStats(result.state.character);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function countLevels(levels: number[]): Record<number, number> {
  return levels.reduce<Record<number, number>>((counts, level) => {
    counts[level] = (counts[level] ?? 0) + 1;
    return counts;
  }, {});
}

function sumChoiceCounts(choiceCounts: StatBlock[]): StatBlock {
  const totals = createEmptyStatBlock();

  for (const counts of choiceCounts) {
    for (const stat of statIds) {
      totals[stat] += counts[stat];
    }
  }

  return totals;
}
