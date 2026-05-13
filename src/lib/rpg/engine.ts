import { mergeGameConfig, type GameConfig, type PartialGameConfig } from "./config";
import { defaultGameContent } from "./content";
import { generateRewardChoices, generateRunPlan } from "./generation";
import {
  getCurrentPlannedEncounter,
  getDifficultyValue,
  getEffectiveStat,
  getEncounterOptionFit,
  getOptionDifficultyValue,
} from "./selectors";
import type {
  Character,
  Equipment,
  EncounterOptionApproach,
  GameContent,
  GameState,
  Item,
  RewardChoice,
  StatId,
} from "./types";

export type CreateInitialGameOptions = {
  config?: PartialGameConfig;
  content?: GameContent;
};

export function createEmptyEquipment(): Equipment {
  return {
    armor: null,
    trinket: null,
    weapon: null,
  };
}

export function createInitialCharacter(config: GameConfig): Character {
  return {
    baseStats: { ...config.startingStats },
    equipment: createEmptyEquipment(),
    health: config.startingHealth,
    inventory: [],
    maxHealth: config.startingHealth,
  };
}

export function createInitialGame(
  seed: string,
  options: CreateInitialGameOptions = {},
): GameState {
  const config = mergeGameConfig(options.config);
  const content = options.content ?? defaultGameContent;

  return {
    character: createInitialCharacter(config),
    config,
    encounterIndex: 0,
    history: [],
    level: 1,
    pendingRewards: [],
    plan: generateRunPlan(seed, config, { content }),
    phase: "encounter",
    seed,
    status: "playing",
  };
}

export type ChoiceOutcome = {
  success: boolean;
  statUsed: StatId;
  effectiveStat: number;
  baseDifficulty: number;
  difficulty: number;
  difficultyModifier: number;
  approach: EncounterOptionApproach;
  healthDelta: number;
  statGain: number;
  level: number;
  encounterIndex: number;
  encounterId: string;
  encounterTitle: string;
  bossEncounter: boolean;
  bossDefeated: boolean;
  completedLevel: boolean;
  gameEnded: boolean;
  message: string;
};

export type ResolveChoiceResult = {
  state: GameState;
  outcome: ChoiceOutcome;
};

export type ResolveChoiceOptions = {
  content?: GameContent;
};

export function resolveChoice(
  state: GameState,
  stat: StatId,
  options: ResolveChoiceOptions = {},
): ResolveChoiceResult {
  if (state.status !== "playing" || state.phase !== "encounter") {
    throw new Error(`Cannot resolve a choice while game is ${state.status}/${state.phase}.`);
  }

  const plannedEncounter = getCurrentPlannedEncounter(state);
  const encounter = plannedEncounter.encounter;
  const bossEncounter = plannedEncounter.source === "boss" || encounter.difficulty === "boss";
  const baseDifficulty = getDifficultyValue(state.config, state.level, encounter.difficulty);
  const optionFit = getEncounterOptionFit(encounter, stat);
  const difficulty = getOptionDifficultyValue(state.config, state.level, encounter, stat);
  const effectiveStat = getEffectiveStat(state.character, stat);
  const success = effectiveStat >= difficulty;
  const statGain = success
    ? bossEncounter
      ? state.config.result.bossSuccessStatGain
      : state.config.result.normalSuccessStatGain
    : 0;
  const failureDamage = bossEncounter
    ? state.config.result.bossFailureDamage
    : state.config.result.normalFailureDamage;

  const nextBaseStats = {
    ...state.character.baseStats,
    [stat]: state.character.baseStats[stat] + statGain,
  };
  const healthAfterFailure = success
    ? state.character.health
    : Math.max(0, state.character.health - failureDamage);
  const healthAfterBossHeal = success && bossEncounter
    ? Math.min(state.character.maxHealth, healthAfterFailure + state.config.result.bossVictoryHeal)
    : healthAfterFailure;

  const nextCharacter: Character = {
    ...state.character,
    baseStats: nextBaseStats,
    health: healthAfterBossHeal,
  };

  const healthDelta = nextCharacter.health - state.character.health;
  const defeatedByFailure = !success && nextCharacter.health <= 0;
  const shouldRetryBoss = bossEncounter && !success && !defeatedByFailure;
  const completedLevel = success || !bossEncounter
    ? isFinalEncounterInLevel(state)
    : false;
  const bossDefeated = bossEncounter && success;

  let nextState: GameState = {
    ...state,
    character: nextCharacter,
  };

  if (defeatedByFailure) {
    nextState = {
      ...nextState,
      phase: "complete",
      status: "lost",
    };
  } else if (!shouldRetryBoss) {
    nextState = advanceAfterCompletedEncounter(nextState, options.content ?? defaultGameContent);
  }

  const outcome: ChoiceOutcome = {
    approach: optionFit.approach,
    baseDifficulty,
    bossDefeated,
    bossEncounter,
    completedLevel,
    difficulty,
    difficultyModifier: optionFit.difficultyModifier,
    effectiveStat,
    encounterId: encounter.id,
    encounterIndex: state.encounterIndex,
    encounterTitle: encounter.title,
    gameEnded: nextState.status === "won" || nextState.status === "lost",
    healthDelta,
    level: state.level,
    message: createOutcomeMessage({
      bossDefeated,
      difficultyModifier: optionFit.difficultyModifier,
      difficulty,
      effectiveStat,
      encounterTitle: encounter.title,
      healthDelta,
      stat,
      statGain,
      success,
    }),
    statGain,
    statUsed: stat,
    success,
  };

  return {
    outcome,
    state: appendHistory(nextState, outcome),
  };
}

function isFinalEncounterInLevel(state: GameState): boolean {
  const levelPlan = state.plan.levels[state.level - 1];

  if (!levelPlan) {
    throw new Error(`No level plan found for level ${state.level}.`);
  }

  return state.encounterIndex >= levelPlan.encounters.length - 1;
}

function advanceAfterCompletedEncounter(state: GameState, content: GameContent): GameState {
  if (!isFinalEncounterInLevel(state)) {
    return {
      ...state,
      encounterIndex: state.encounterIndex + 1,
    };
  }

  if (state.level >= state.config.maxLevel) {
    return {
      ...state,
      phase: "complete",
      status: "won",
    };
  }

  const pendingRewards = generateRewardChoices({
    character: state.character,
    config: state.config,
    content,
    level: state.level,
    seed: state.seed,
  });

  return {
    ...state,
    pendingRewards,
    phase: "reward",
    status: "reward",
  };
}

export type ChooseRewardResult = {
  state: GameState;
  reward: RewardChoice;
};

export function chooseReward(state: GameState, rewardIdOrItemId: string): ChooseRewardResult {
  if (state.status !== "reward" || state.phase !== "reward") {
    throw new Error(`Cannot choose a reward while game is ${state.status}/${state.phase}.`);
  }

  const reward = state.pendingRewards.find(
    (choice) => choice.id === rewardIdOrItemId || choice.item.id === rewardIdOrItemId,
  );

  if (!reward) {
    throw new Error(`Reward ${rewardIdOrItemId} is not currently available.`);
  }

  const nextCharacter: Character = {
    ...state.character,
    inventory: addOwnedItem(state.character.inventory, reward.item),
  };

  return {
    reward,
    state: appendRewardHistory({
      ...state,
      character: nextCharacter,
      encounterIndex: 0,
      level: state.level + 1,
      pendingRewards: [],
      phase: "encounter",
      status: "playing",
    }, reward),
  };
}

export type EquipItemResult = {
  state: GameState;
  item: Item;
  replacedItem: Item | null;
};

export function equipItem(state: GameState, itemId: string): EquipItemResult {
  if (state.status === "lost") {
    throw new Error("Cannot equip items after losing the game.");
  }

  const item = findOwnedItem(state.character, itemId);

  if (!item) {
    throw new Error(`Item ${itemId} is not owned by the character.`);
  }

  const replacedItem = state.character.equipment[item.slot];

  return {
    item,
    replacedItem,
    state: {
      ...state,
      character: {
        ...state.character,
        equipment: {
          ...state.character.equipment,
          [item.slot]: item,
        },
      },
    },
  };
}

function appendHistory(state: GameState, outcome: ChoiceOutcome): GameState {
  return {
    ...state,
    history: [
      ...state.history,
      {
        encounterIndex: outcome.encounterIndex,
        id: `history_${state.history.length + 1}`,
        level: outcome.level,
        outcome: {
          bossDefeated: outcome.bossDefeated,
          bossEncounter: outcome.bossEncounter,
          completedLevel: outcome.completedLevel,
          gameEnded: outcome.gameEnded,
          healthDelta: outcome.healthDelta,
          statGain: outcome.statGain,
          statUsed: outcome.statUsed,
          success: outcome.success,
        },
        text: outcome.message,
        type: "choice",
      },
    ],
  };
}

function appendRewardHistory(state: GameState, reward: RewardChoice): GameState {
  return {
    ...state,
    history: [
      ...state.history,
      {
        encounterIndex: state.encounterIndex,
        id: `history_${state.history.length + 1}`,
        level: reward.level,
        rewardItemId: reward.item.id,
        text: `Level ${reward.level} reward: kept ${reward.item.name}.`,
        type: "reward",
      },
    ],
  };
}

function addOwnedItem(inventory: Item[], item: Item): Item[] {
  if (inventory.some((ownedItem) => ownedItem.id === item.id)) {
    return inventory;
  }

  return [...inventory, item];
}

function findOwnedItem(character: Character, itemId: string): Item | null {
  return character.inventory.find((item) => item.id === itemId) ?? null;
}

function createOutcomeMessage(input: {
  success: boolean;
  stat: StatId;
  encounterTitle: string;
  effectiveStat: number;
  difficulty: number;
  difficultyModifier: number;
  healthDelta: number;
  statGain: number;
  bossDefeated: boolean;
}) {
  const modifierText = input.difficultyModifier === 0
    ? ""
    : input.difficultyModifier > 0
      ? `, +${input.difficultyModifier} fit`
      : `, ${input.difficultyModifier} fit`;
  const checkText = `${input.stat} ${input.effectiveStat} vs ${input.difficulty}${modifierText}`;

  if (input.success) {
    const bossText = input.bossDefeated ? " Boss defeated." : "";
    const healText = input.healthDelta > 0 ? ` Restored ${input.healthDelta} health.` : "";
    return `${input.encounterTitle}: success (${checkText}). +${input.statGain} ${input.stat}.${bossText}${healText}`;
  }

  return `${input.encounterTitle}: failure (${checkText}). Lost ${Math.abs(input.healthDelta)} health.`;
}
