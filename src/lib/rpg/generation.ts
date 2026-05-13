import type { GameConfig } from "./config";
import { defaultGameContent } from "./content";
import { createRng } from "./rng";
import { getStrongestStat } from "./selectors";
import {
  equipmentSlots,
  type EncounterOptionApproach,
  statIds,
  type Character,
  type Encounter,
  type GameContent,
  type Item,
  type LevelPlan,
  type PlannedEncounter,
  type PlannedEncounterSource,
  type RewardChoice,
  type RewardReason,
  type RunPlan,
  type StatId,
} from "./types";

const encounterOptionApproaches: readonly EncounterOptionApproach[] = [
  "favored",
  "standard",
  "strained",
];

export type GenerateRunPlanOptions = {
  content?: GameContent;
};

export function validateGameContent(config: GameConfig, content: GameContent) {
  validateStoryContent(content.story);

  if (config.maxLevel < 1) {
    throw new Error("Game config requires at least one level.");
  }

  if (config.encountersPerLevel < 2) {
    throw new Error("Game config requires at least two encounters per level.");
  }

  const randomSlotsRequired = config.bossLevels.length > 0
    ? Math.max(config.encountersPerLevel - 1, config.encountersPerLevel - 2)
    : config.encountersPerLevel - 1;

  if (content.randomEncounters.length < randomSlotsRequired) {
    throw new Error(
      `Random encounter pool needs at least ${randomSlotsRequired} entries for this config.`,
    );
  }

  if (content.items.length < config.rewards.choicesPerLevel) {
    throw new Error(
      `Item pool needs at least ${config.rewards.choicesPerLevel} entries for reward choices.`,
    );
  }

  for (let level = 1; level <= config.maxLevel; level += 1) {
    if (!content.fixedEncounters[level]) {
      throw new Error(`Missing fixed encounter for level ${level}.`);
    }
  }

  for (const bossLevel of config.bossLevels) {
    if (bossLevel < 1 || bossLevel > config.maxLevel) {
      throw new Error(`Boss level ${bossLevel} is outside configured level range.`);
    }

    if (!content.bossEncounters[bossLevel]) {
      throw new Error(`Missing boss encounter for level ${bossLevel}.`);
    }
  }

  const encounters = [
    ...Object.values(content.fixedEncounters),
    ...content.randomEncounters,
    ...Object.values(content.bossEncounters),
  ];

  for (const encounter of encounters) {
    validateEncounter(encounter);
  }

  ensureUniqueIds("Encounter", encounters);

  for (const item of content.items) {
    validateItem(item);
  }

  ensureUniqueIds("Item", content.items);
}

function validateStoryContent(story: GameContent["story"]) {
  if (!story) {
    throw new Error("Missing story content.");
  }

  for (const field of [
    "title",
    "subtitle",
    "intro",
    "levelClearedTitle",
    "levelClearedDescription",
    "bossDefeatedTitle",
    "bossDefeatedDescription",
    "victoryTitle",
    "victoryDescription",
    "defeatTitle",
    "defeatDescription",
  ] as const) {
    if (story[field].trim().length === 0) {
      throw new Error(`Story field ${field} cannot be empty.`);
    }
  }

  for (const [act, intro] of Object.entries(story.actIntros)) {
    if (intro.title.trim().length === 0 || intro.description.trim().length === 0) {
      throw new Error(`Story act intro ${act} cannot be empty.`);
    }
  }
}

function validateEncounter(encounter: Encounter) {
  if (encounter.id.trim().length === 0) {
    throw new Error("Encounter id cannot be empty.");
  }

  if (encounter.title.trim().length === 0) {
    throw new Error(`Encounter ${encounter.id} requires a title.`);
  }

  if (encounter.description.trim().length === 0) {
    throw new Error(`Encounter ${encounter.id} requires a description.`);
  }

  for (const stat of statIds) {
    const option = encounter.options[stat];

    if (!option) {
      throw new Error(`Encounter ${encounter.id} is missing a ${stat} option.`);
    }

    if (option.stat !== stat) {
      throw new Error(`Encounter ${encounter.id} has a mismatched ${stat} option.`);
    }

    if (option.label.trim().length === 0) {
      throw new Error(`Encounter ${encounter.id} has an empty ${stat} label.`);
    }

    if (option.description.trim().length === 0) {
      throw new Error(`Encounter ${encounter.id} has an empty ${stat} description.`);
    }

    if (option.approach && !encounterOptionApproaches.includes(option.approach)) {
      throw new Error(`Encounter ${encounter.id} has an invalid ${stat} approach.`);
    }

    if (
      option.difficultyModifier !== undefined &&
      !Number.isInteger(option.difficultyModifier)
    ) {
      throw new Error(`Encounter ${encounter.id} has an invalid ${stat} modifier.`);
    }
  }
}

function validateItem(item: Item) {
  if (item.id.trim().length === 0) {
    throw new Error("Item id cannot be empty.");
  }

  if (item.name.trim().length === 0) {
    throw new Error(`Item ${item.id} requires a name.`);
  }

  if (item.description.trim().length === 0) {
    throw new Error(`Item ${item.id} requires a description.`);
  }

  if (!equipmentSlots.includes(item.slot)) {
    throw new Error(`Item ${item.id} has unsupported slot ${item.slot}.`);
  }

  if (item.tier < 1) {
    throw new Error(`Item ${item.id} requires a positive tier.`);
  }

  const statKeys = Object.keys(item.bonuses);
  const unknownStat = statKeys.find((stat) => !statIds.includes(stat as StatId));

  if (unknownStat) {
    throw new Error(`Item ${item.id} has unknown stat bonus ${unknownStat}.`);
  }

  const positiveStats = statIds.filter((stat) => (item.bonuses[stat] ?? 0) > 0);

  if (positiveStats.length === 0) {
    throw new Error(`Item ${item.id} requires at least one positive stat bonus.`);
  }
}

function ensureUniqueIds(label: string, records: Array<{ id: string }>) {
  const seenIds = new Set<string>();

  for (const record of records) {
    if (seenIds.has(record.id)) {
      throw new Error(`${label} id ${record.id} is duplicated.`);
    }

    seenIds.add(record.id);
  }
}

export type GenerateRewardChoicesInput = {
  seed: string;
  level: number;
  character: Character;
  config: GameConfig;
  content?: GameContent;
};

export function generateRewardChoices(input: GenerateRewardChoicesInput): RewardChoice[] {
  const content = input.content ?? defaultGameContent;
  validateGameContent(input.config, content);

  const strongestStat = getStrongestStat(input.character);
  const rewardTier = getRewardTier(input.level, input.config);
  const rng = createRng(`${input.seed}:rewards:${input.level}:${strongestStat}`);
  const ownedItemIds = getOwnedItemIds(input.character);
  const eligibleItems = content.items.filter((item) => item.tier <= rewardTier);
  const unownedEligibleItems = eligibleItems.filter((item) => !ownedItemIds.has(item.id));
  const pool = unownedEligibleItems.length >= input.config.rewards.choicesPerLevel
    ? unownedEligibleItems
    : eligibleItems;

  const selections: Array<{ item: Item; reason: RewardReason }> = [];
  addRewardSelection(selections, {
    item: pickRewardItem({
      fallbackPool: pool,
      preferredPool: pool.filter((item) => itemBenefitsStat(item, strongestStat)),
      rng,
      selections,
    }),
    reason: "strongest_stat",
  });
  addRewardSelection(selections, {
    item: pickRewardItem({
      fallbackPool: pool,
      preferredPool: pool,
      rng,
      selections,
    }),
    reason: "random",
  });
  addRewardSelection(selections, {
    item: pickRewardItem({
      fallbackPool: pool,
      preferredPool: pool.filter((item) => getBonusStatCount(item) > 1),
      rng,
      selections,
    }),
    reason: "mixed",
  });

  while (selections.length < input.config.rewards.choicesPerLevel) {
    addRewardSelection(selections, {
      item: pickRewardItem({
        fallbackPool: pool,
        preferredPool: pool,
        rng,
        selections,
      }),
      reason: "random",
    });
  }

  return selections.slice(0, input.config.rewards.choicesPerLevel).map((selection, index) => ({
    id: `reward_${input.level}_${index}_${selection.item.id}`,
    item: selection.item,
    level: input.level,
    reason: selection.reason,
    tier: rewardTier,
  }));
}

export function getRewardTier(level: number, config: GameConfig): number {
  const actTier = Math.max(1, Math.ceil(level / 5));
  const bossTierBonus = config.bossLevels.includes(level) ? config.rewards.bossTierBonus : 0;

  return actTier + bossTierBonus;
}

function addRewardSelection(
  selections: Array<{ item: Item; reason: RewardReason }>,
  selection: { item: Item; reason: RewardReason },
) {
  if (selections.some((existing) => existing.item.id === selection.item.id)) {
    return;
  }

  selections.push(selection);
}

function pickRewardItem(input: {
  preferredPool: Item[];
  fallbackPool: Item[];
  selections: Array<{ item: Item; reason: RewardReason }>;
  rng: ReturnType<typeof createRng>;
}): Item {
  const alreadySelectedIds = new Set(input.selections.map((selection) => selection.item.id));
  const preferred = input.preferredPool.filter((item) => !alreadySelectedIds.has(item.id));

  if (preferred.length > 0) {
    return input.rng.pick(preferred);
  }

  const fallback = input.fallbackPool.filter((item) => !alreadySelectedIds.has(item.id));

  if (fallback.length > 0) {
    return input.rng.pick(fallback);
  }

  return input.rng.pick(input.fallbackPool);
}

function itemBenefitsStat(item: Item, stat: StatId): boolean {
  return (item.bonuses[stat] ?? 0) > 0;
}

function getBonusStatCount(item: Item): number {
  return Object.values(item.bonuses).filter((bonus) => (bonus ?? 0) > 0).length;
}

function getOwnedItemIds(character: Character): Set<string> {
  return new Set([
    ...character.inventory.map((item) => item.id),
    ...Object.values(character.equipment)
      .filter((item): item is Item => item !== null)
      .map((item) => item.id),
  ]);
}

export function generateRunPlan(
  seed: string,
  config: GameConfig,
  options: GenerateRunPlanOptions = {},
): RunPlan {
  const content = options.content ?? defaultGameContent;
  validateGameContent(config, content);

  const rng = createRng(`${seed}:run-plan`);
  const levels: LevelPlan[] = [];
  const bossLevelSet = new Set(config.bossLevels);

  for (let level = 1; level <= config.maxLevel; level += 1) {
    const isBossLevel = bossLevelSet.has(level);
    const encounters: PlannedEncounter[] = [
      createPlannedEncounter({
        encounter: content.fixedEncounters[level]!,
        level,
        slot: 0,
        source: "fixed",
      }),
    ];

    const reservedBossSlots = isBossLevel ? 1 : 0;
    const randomSlots = config.encountersPerLevel - encounters.length - reservedBossSlots;
    const randomPool = [...content.randomEncounters];

    for (let randomSlot = 0; randomSlot < randomSlots; randomSlot += 1) {
      const randomIndex = rng.int(0, randomPool.length - 1);
      const [encounter] = randomPool.splice(randomIndex, 1);

      encounters.push(
        createPlannedEncounter({
          encounter: encounter!,
          level,
          slot: encounters.length,
          source: "random",
        }),
      );
    }

    if (isBossLevel) {
      encounters.push(
        createPlannedEncounter({
          encounter: content.bossEncounters[level]!,
          level,
          slot: encounters.length,
          source: "boss",
        }),
      );
    }

    levels.push({
      encounters,
      isBossLevel,
      level,
    });
  }

  return {
    levels,
    seed,
  };
}

function createPlannedEncounter(input: {
  encounter: Encounter;
  level: number;
  slot: number;
  source: PlannedEncounterSource;
}): PlannedEncounter {
  return {
    encounter: input.encounter,
    level: input.level,
    slot: input.slot,
    source: input.source,
  };
}
