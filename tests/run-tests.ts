import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  chooseReward,
  createCyclicStatStrategy,
  createFocusedStrategy,
  createRng,
  createInitialGame,
  createSeededRandomStrategy,
  defaultGameConfig,
  defaultGameContent,
  equipItem,
  generateRewardChoices,
  generateRunPlan,
  getBossReadiness,
  getBuildIdentity,
  getChoiceForecast,
  getCurrentAct,
  getCurrentEncounter,
  getDifficultyValue,
  getEffectiveStat,
  getEffectiveStats,
  getEquipmentBonuses,
  getEncounterOptionFit,
  getDistanceToNextBoss,
  getLevelPurpose,
  getLevelRunSummary,
  getMilestoneStatus,
  getNextBossLevel,
  getOptionDifficultyValue,
  getPressureLevel,
  getRewardComparison,
  getRunSummary,
  getStrongestStat,
  getUnderbuiltStatus,
  getRewardTier,
  getSimulationEffectiveStats,
  highestEffectiveStatStrategy,
  mergeGameConfig,
  resolveChoice,
  simulateGame,
  simulateStrategyBatch,
  statIds,
  validateGameContent,
  type GameContent,
  type Item,
} from "../src/lib/rpg";

const tests: Array<{ name: string; run: () => void }> = [];
const balanceSeeds = Array.from({ length: 32 }, (_value, index) => `balance_${index + 1}`);

function test(name: string, run: () => void) {
  tests.push({ name, run });
}

test("creates an initial game from the default config", () => {
  const state = createInitialGame("alpha-seed");

  assert.equal(state.seed, "alpha-seed");
  assert.equal(state.status, "playing");
  assert.equal(state.phase, "encounter");
  assert.equal(state.level, 1);
  assert.equal(state.encounterIndex, 0);
  assert.equal(state.character.health, 10);
  assert.equal(state.character.maxHealth, 10);
  assert.deepEqual(state.character.baseStats, {
    agility: 2,
    intellect: 2,
    spirit: 2,
    strength: 2,
  });
  assert.deepEqual(state.character.inventory, []);
  assert.deepEqual(state.character.equipment, {
    armor: null,
    trinket: null,
    weapon: null,
  });
  assert.deepEqual(state.pendingRewards, []);
  assert.equal(state.plan.seed, "alpha-seed");
  assert.equal(state.plan.levels.length, 20);
  assert.equal(state.plan.levels[0]?.level, 1);
  assert.equal(state.config.maxLevel, 20);
  assert.deepEqual(state.config.bossLevels, [5, 10, 15, 20]);
});

test("allows the initial game config to be overridden without mutating defaults", () => {
  const state = createInitialGame("slice", {
    config: {
      bossLevels: [5],
      maxLevel: 5,
      startingHealth: 12,
      startingStats: {
        strength: 4,
      },
    },
  });
  const defaultState = createInitialGame("default");

  assert.equal(state.character.health, 12);
  assert.equal(state.character.maxHealth, 12);
  assert.equal(state.character.baseStats.strength, 4);
  assert.equal(state.character.baseStats.agility, 2);
  assert.equal(defaultState.character.health, 10);
  assert.equal(defaultState.character.baseStats.strength, 2);
});

test("merges nested game config sections", () => {
  const config = mergeGameConfig({
    difficulty: {
      bossOffset: 9,
    },
    result: {
      normalFailureDamage: 3,
    },
    rewards: {
      choicesPerLevel: 4,
    },
  });

  assert.equal(config.difficulty.normalOffset, 1);
  assert.equal(config.difficulty.bossOffset, 9);
  assert.equal(config.result.normalFailureDamage, 3);
  assert.equal(config.result.bossFailureDamage, 2);
  assert.equal(config.rewards.choicesPerLevel, 4);
  assert.equal(config.rewards.bossTierBonus, 1);
});

test("calculates equipment bonuses and effective stats", () => {
  const state = createInitialGame("gear");
  const gauntlets: Item = {
    bonuses: { strength: 2 },
    description: "Heavy iron grips for decisive force.",
    id: "iron_gauntlets",
    name: "Iron Gauntlets",
    slot: "weapon",
    tier: 1,
  };
  const cloak: Item = {
    bonuses: { agility: 1, intellect: 1 },
    description: "A travel cloak stitched with hidden pockets.",
    id: "balanced_cloak",
    name: "Balanced Cloak",
    slot: "armor",
    tier: 1,
  };

  const character = {
    ...state.character,
    equipment: {
      ...state.character.equipment,
      armor: cloak,
      weapon: gauntlets,
    },
  };

  assert.deepEqual(getEquipmentBonuses(character), {
    agility: 1,
    intellect: 1,
    spirit: 0,
    strength: 2,
  });
  assert.deepEqual(getEffectiveStats(character), {
    agility: 3,
    intellect: 3,
    spirit: 2,
    strength: 4,
  });
  assert.equal(getEffectiveStat(character, "strength"), 4);
});

test("selects the strongest effective stat with stable tie behavior", () => {
  const state = createInitialGame("ties");

  assert.equal(getStrongestStat(state.character), "strength");

  const charm: Item = {
    bonuses: { spirit: 3 },
    description: "A warm charm that steadies the bearer.",
    id: "ember_charm",
    name: "Ember Charm",
    slot: "trinket",
    tier: 1,
  };
  const character = {
    ...state.character,
    equipment: {
      ...state.character.equipment,
      trinket: charm,
    },
  };

  assert.equal(getStrongestStat(character), "spirit");
});

test("identifies the current build from the strongest effective stat", () => {
  const state = createInitialGame("build-identity");

  assert.deepEqual(getBuildIdentity(state.character), {
    archetype: "Warrior",
    label: "Warrior path",
    name: "Strength",
    stat: "strength",
  });

  const charm: Item = {
    bonuses: { spirit: 4 },
    description: "A bright charm for focused will.",
    id: "test_spirit_charm",
    name: "Test Spirit Charm",
    slot: "trinket",
    tier: 1,
  };
  const character = {
    ...state.character,
    equipment: {
      ...state.character.equipment,
      trinket: charm,
    },
  };

  assert.equal(getBuildIdentity(character).label, "Mystic path");
  assert.equal(getBuildIdentity(character).stat, "spirit");
});

test("calculates act progress and next boss level", () => {
  const state = createInitialGame("act-progress");

  assert.deepEqual(getCurrentAct(state), {
    act: 1,
    endLevel: 5,
    label: "Act 1",
    level: 1,
    levelInAct: 1,
    levelsInAct: 5,
    startLevel: 1,
  });
  assert.equal(getNextBossLevel(state), 5);

  const midState = {
    ...state,
    level: 12,
  };

  assert.equal(getCurrentAct(midState).act, 3);
  assert.equal(getCurrentAct(midState).levelInAct, 2);
  assert.equal(getNextBossLevel(midState), 15);

  const clearedBossRewardState = {
    ...state,
    level: 5,
    phase: "reward" as const,
    status: "reward" as const,
  };

  assert.equal(getNextBossLevel(clearedBossRewardState), 10);

  const completeState = {
    ...state,
    phase: "complete" as const,
    status: "won" as const,
  };

  assert.equal(getNextBossLevel(completeState), null);
});

test("calculates level purpose, distance, pressure, and underbuilt state", () => {
  const state = createInitialGame("run-flow", {
    config: {
      startingStats: {
        strength: 8,
      },
    },
  });

  assert.equal(getLevelPurpose(state).id, "training");
  assert.equal(getDistanceToNextBoss(state), 4);
  assert.equal(getPressureLevel(state), "medium");

  const underbuilt = getUnderbuiltStatus(state, "strength");
  assert.equal(underbuilt.targetDifficulty, 9);
  assert.equal(underbuilt.effectiveStat, 8);
  assert.equal(underbuilt.gap, -1);
  assert.equal(underbuilt.underbuilt, true);
  assert.equal(underbuilt.urgent, false);

  const bossPrepState = {
    ...state,
    level: 4,
  };

  assert.equal(getLevelPurpose(bossPrepState).id, "boss_prep");
  assert.equal(getDistanceToNextBoss(bossPrepState), 1);
  assert.equal(getPressureLevel(bossPrepState), "critical");

  const bossState = {
    ...state,
    encounterIndex: 2,
    level: 5,
  };

  assert.equal(getLevelPurpose(bossState).id, "boss");

  const finalBossState = {
    ...state,
    encounterIndex: 2,
    level: 20,
  };

  assert.equal(getLevelPurpose(finalBossState).id, "final_boss");
});

test("summarizes run choices and cleared level performance", () => {
  let state = createInitialGame("run-summary", {
    config: {
      startingStats: {
        agility: 20,
        intellect: 20,
        spirit: 20,
        strength: 20,
      },
    },
  });

  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "agility").state;

  const summary = getRunSummary(state);
  const levelSummary = getLevelRunSummary(state, 1);

  assert.equal(summary.totalChoices, 3);
  assert.equal(summary.successes, 3);
  assert.equal(summary.failures, 0);
  assert.equal(summary.levelsCleared, 1);
  assert.equal(summary.chosenStatsCount, 2);
  assert.equal(summary.dominantStat, "strength");
  assert.equal(summary.buildConsistency, 2 / 3);
  assert.equal(summary.choiceCounts.strength, 2);
  assert.equal(summary.choiceCounts.agility, 1);
  assert.equal(levelSummary.level, 1);
  assert.equal(levelSummary.totalChoices, 3);
  assert.equal(levelSummary.successes, 3);
  assert.equal(levelSummary.dominantStat, "strength");
});

test("combines next milestone status for UI display", () => {
  const state = createInitialGame("milestone", {
    config: {
      startingStats: {
        strength: 9,
      },
    },
  });
  const milestone = getMilestoneStatus(state);

  assert.equal(milestone.nextBossLevel, 5);
  assert.equal(milestone.nextBossTitle, "The Stone Warden");
  assert.equal(milestone.distanceToNextBoss, 4);
  assert.equal(milestone.levelPurpose.id, "training");
  assert.equal(milestone.underbuilt.underbuilt, false);
});

test("calculates boss readiness for every stat", () => {
  const state = createInitialGame("boss-readiness", {
    config: {
      startingStats: {
        strength: 9,
      },
    },
  });
  const readiness = getBossReadiness(state);

  assert.equal(readiness?.bossLevel, 5);
  assert.equal(readiness?.bossTitle, "The Stone Warden");
  assert.equal(readiness?.difficulty, 9);
  assert.equal(readiness?.stats.strength.ready, true);
  assert.equal(readiness?.stats.strength.gap, 0);
  assert.equal(readiness?.stats.intellect.ready, false);
  assert.equal(readiness?.stats.intellect.gap, -7);
});

test("forecasts encounter choices without resolving them", () => {
  const passState = createInitialGame("choice-forecast", {
    config: {
      startingStats: {
        strength: 3,
      },
    },
  });
  const passForecast = getChoiceForecast(passState, "strength");

  assert.equal(passForecast.success, true);
  assert.equal(passForecast.effectiveStat, 3);
  assert.equal(passForecast.baseDifficulty, 2);
  assert.equal(passForecast.difficulty, 1);
  assert.equal(passForecast.difficultyModifier, -1);
  assert.equal(passForecast.approach, "favored");
  assert.equal(passForecast.statGainOnSuccess, 1);
  assert.equal(passForecast.healthLossOnFailure, 1);
  assert.equal(passForecast.bossEncounter, false);

  const bossState = {
    ...createInitialGame("boss-choice-forecast"),
    character: {
      ...createInitialGame("boss-choice-forecast").character,
      health: 2,
    },
    encounterIndex: 2,
    level: 5,
  };
  const bossForecast = getChoiceForecast(bossState, "strength");

  assert.equal(bossForecast.success, false);
  assert.equal(bossForecast.bossEncounter, true);
  assert.equal(bossForecast.approach, "standard");
  assert.equal(bossForecast.difficultyModifier, 0);
  assert.equal(bossForecast.statGainOnSuccess, 2);
  assert.equal(bossForecast.healthLossOnFailure, 2);
  assert.equal(bossForecast.bossRetriesOnFailure, false);
  assert.equal(bossForecast.wouldLoseOnFailure, true);
});

test("calculates per-option difficulty fit from encounter content", () => {
  const state = createInitialGame("option-fit");
  const encounter = getCurrentEncounter(state);

  assert.deepEqual(getEncounterOptionFit(encounter, "strength"), {
    approach: "favored",
    difficultyModifier: -1,
  });
  assert.deepEqual(getEncounterOptionFit(encounter, "spirit"), {
    approach: "strained",
    difficultyModifier: 2,
  });
  assert.equal(getDifficultyValue(state.config, state.level, encounter.difficulty), 2);
  assert.equal(getOptionDifficultyValue(state.config, state.level, encounter, "strength"), 1);
  assert.equal(getOptionDifficultyValue(state.config, state.level, encounter, "spirit"), 4);
});

test("compares reward items against currently equipped gear", () => {
  const breakerBlade = defaultGameContent.items.find(
    (candidate) => candidate.id === "breaker_blade",
  )!;
  const titanEdge = defaultGameContent.items.find((candidate) => candidate.id === "titan_edge")!;
  const baseState = createInitialGame("reward-comparison");
  const state = {
    ...baseState,
    character: {
      ...baseState.character,
      equipment: {
        ...baseState.character.equipment,
        weapon: breakerBlade,
      },
    },
  };
  const comparison = getRewardComparison(state.character, titanEdge, "strength");

  assert.equal(comparison.slotItem?.id, "breaker_blade");
  assert.equal(comparison.matchesBuild, true);
  assert.equal(comparison.improvesSlot, true);
  assert.equal(comparison.totalDelta, 2);
  assert.equal(comparison.buildStatDelta, 2);
  assert.equal(comparison.statDeltas.strength, 2);
});

test("seeded RNG repeats the same sequence for the same seed", () => {
  const first = createRng("repeatable");
  const second = createRng("repeatable");
  const different = createRng("different");

  const firstValues = [first.int(1, 100), first.int(1, 100), first.int(1, 100)];
  const secondValues = [second.int(1, 100), second.int(1, 100), second.int(1, 100)];
  const differentValues = [
    different.int(1, 100),
    different.int(1, 100),
    different.int(1, 100),
  ];

  assert.deepEqual(firstValues, secondValues);
  assert.notDeepEqual(firstValues, differentValues);
});

test("generates the same run plan for the same seed and config", () => {
  const config = mergeGameConfig({
    bossLevels: [5],
    maxLevel: 5,
  });

  const first = generateRunPlan("same-seed", config);
  const second = generateRunPlan("same-seed", config);

  assert.deepEqual(first, second);
  assert.equal(first.levels.length, 5);
  assert.equal(first.levels[4]?.isBossLevel, true);
  assert.equal(first.levels[4]?.encounters[2]?.source, "boss");
});

test("generates different random encounter sequences for different seeds", () => {
  const config = mergeGameConfig({
    bossLevels: [5],
    maxLevel: 5,
  });

  const first = generateRunPlan("alpha-seed", config);
  const second = generateRunPlan("beta-seed", config);
  const randomIds = (plan: typeof first) =>
    plan.levels.flatMap((level) =>
      level.encounters
        .filter((planned) => planned.source === "random")
        .map((planned) => planned.encounter.id),
    );

  assert.notDeepEqual(randomIds(first), randomIds(second));
});

test("generates valid default level plans with bosses in final slots", () => {
  const config = mergeGameConfig();
  const plan = generateRunPlan("full-run", config);
  const bossLevels = new Set(defaultGameConfig.bossLevels);

  assert.equal(plan.levels.length, defaultGameConfig.maxLevel);

  for (const level of plan.levels) {
    assert.equal(level.encounters.length, defaultGameConfig.encountersPerLevel);
    assert.equal(level.isBossLevel, bossLevels.has(level.level));
    assert.equal(level.encounters[0]?.source, "fixed");

    for (const [index, planned] of level.encounters.entries()) {
      assert.equal(planned.level, level.level);
      assert.equal(planned.slot, index);
    }

    const randomIds = level.encounters
      .filter((planned) => planned.source === "random")
      .map((planned) => planned.encounter.id);

    assert.equal(new Set(randomIds).size, randomIds.length);

    if (bossLevels.has(level.level)) {
      assert.equal(level.encounters.at(-1)?.source, "boss");
      assert.equal(level.encounters.at(-1)?.encounter.difficulty, "boss");
    } else {
      assert.equal(level.encounters.some((planned) => planned.source === "boss"), false);
    }
  }
});

test("generates deterministic reward choices biased toward the strongest stat", () => {
  const baseState = createInitialGame("reward-seed", {
    config: {
      startingStats: {
        strength: 8,
      },
    },
  });
  const first = generateRewardChoices({
    character: baseState.character,
    config: baseState.config,
    level: 1,
    seed: baseState.seed,
  });
  const second = generateRewardChoices({
    character: baseState.character,
    config: baseState.config,
    level: 1,
    seed: baseState.seed,
  });

  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.equal(first[0]?.reason, "strongest_stat");
  assert.ok((first[0]?.item.bonuses.strength ?? 0) > 0);
  assert.equal(new Set(first.map((choice) => choice.item.id)).size, first.length);
});

test("calculates reward tier from level and boss bonus", () => {
  const config = mergeGameConfig();

  assert.equal(getRewardTier(1, config), 1);
  assert.equal(getRewardTier(5, config), 2);
  assert.equal(getRewardTier(6, config), 2);
  assert.equal(getRewardTier(20, config), 5);
});

test("validates missing required generation content", () => {
  const fixedEncounters = { ...defaultGameContent.fixedEncounters };
  delete fixedEncounters[3];

  const brokenContent: GameContent = {
    ...defaultGameContent,
    fixedEncounters,
  };

  assert.throws(() => {
    validateGameContent(mergeGameConfig({ bossLevels: [5], maxLevel: 5 }), brokenContent);
  }, /Missing fixed encounter for level 3/);
});

test("validates missing required item content", () => {
  const brokenContent: GameContent = {
    ...defaultGameContent,
    items: [],
  };

  assert.throws(() => {
    validateGameContent(mergeGameConfig({ bossLevels: [5], maxLevel: 5 }), brokenContent);
  }, /Item pool needs at least 3 entries/);
});

test("default V1 content meets pool size and shape targets", () => {
  assert.equal(Object.keys(defaultGameContent.fixedEncounters).length, 20);
  assert.equal(defaultGameContent.randomEncounters.length, 30);
  assert.equal(Object.keys(defaultGameContent.bossEncounters).length, 4);
  assert.equal(defaultGameContent.items.length, 40);
  assert.ok(defaultGameContent.story.intro.length > 0);
  assert.ok(defaultGameContent.story.victoryDescription.length > 0);
  assert.ok(defaultGameContent.story.defeatDescription.length > 0);

  const encounters = [
    ...Object.values(defaultGameContent.fixedEncounters),
    ...defaultGameContent.randomEncounters,
    ...Object.values(defaultGameContent.bossEncounters),
  ];
  const encounterIds = encounters.map((encounter) => encounter.id);
  const itemIds = defaultGameContent.items.map((item) => item.id);

  assert.equal(new Set(encounterIds).size, encounterIds.length);
  assert.equal(new Set(itemIds).size, itemIds.length);

  for (const encounter of encounters) {
    for (const stat of statIds) {
      assert.equal(encounter.options[stat].stat, stat);
      assert.ok(encounter.options[stat].label.length > 0);
      assert.ok(encounter.options[stat].description.length > 0);
    }
  }

  for (const item of defaultGameContent.items) {
    assert.ok(Object.values(item.bonuses).some((bonus) => (bonus ?? 0) > 0));
  }
});

test("validates duplicate content ids", () => {
  const duplicateItem = defaultGameContent.items[0]!;
  const brokenContent: GameContent = {
    ...defaultGameContent,
    items: [...defaultGameContent.items, duplicateItem],
  };

  assert.throws(() => {
    validateGameContent(mergeGameConfig(), brokenContent);
  }, /Item id .* is duplicated/);
});

test("selects the current encounter and calculates configured difficulty", () => {
  const state = createInitialGame("current-encounter");
  const encounter = getCurrentEncounter(state);

  assert.equal(encounter.id, "fixed_01_fallen_gate");
  assert.equal(getDifficultyValue(state.config, state.level, encounter.difficulty), 2);
});

test("resolves a normal success with stat gain and encounter advancement", () => {
  const state = createInitialGame("normal-success", {
    config: {
      startingStats: {
        strength: 3,
      },
    },
  });
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, true);
  assert.equal(result.outcome.statGain, 1);
  assert.equal(result.outcome.healthDelta, 0);
  assert.equal(result.state.character.baseStats.strength, 4);
  assert.equal(result.state.character.health, 10);
  assert.equal(result.state.level, 1);
  assert.equal(result.state.encounterIndex, 1);
  assert.equal(result.state.history.length, 1);
});

test("resolves a normal failure with health loss and encounter advancement", () => {
  const state = createInitialGame("normal-failure", {
    config: {
      startingStats: {
        strength: 0,
      },
    },
  });
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, false);
  assert.equal(result.outcome.statGain, 0);
  assert.equal(result.outcome.healthDelta, -1);
  assert.equal(result.state.character.baseStats.strength, 0);
  assert.equal(result.state.character.health, 9);
  assert.equal(result.state.level, 1);
  assert.equal(result.state.encounterIndex, 1);
});

test("default level-one normal checks are passable with starting stats", () => {
  const state = createInitialGame("starting-check");
  const encounter = getCurrentEncounter(state);
  const difficulty = getDifficultyValue(state.config, state.level, encounter.difficulty);

  for (const stat of statIds) {
    assert.ok(getEffectiveStat(state.character, stat) >= difficulty);
  }
});

test("enters reward phase after the final non-boss encounter in a level", () => {
  let state = createInitialGame("level-advance", {
    config: {
      startingStats: {
        agility: 20,
        intellect: 20,
        spirit: 20,
        strength: 20,
      },
    },
  });

  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;

  assert.equal(state.level, 1);
  assert.equal(state.encounterIndex, 2);
  assert.equal(state.status, "reward");
  assert.equal(state.phase, "reward");
  assert.equal(state.pendingRewards.length, 3);
  assert.equal(state.history.length, 3);
});

test("rejects encounter resolution while a reward is pending", () => {
  let state = createInitialGame("reward-blocks-resolution", {
    config: {
      startingStats: {
        agility: 20,
        intellect: 20,
        spirit: 20,
        strength: 20,
      },
    },
  });

  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;

  assert.throws(() => {
    resolveChoice(state, "strength");
  }, /Cannot resolve a choice/);
});

test("chooses a reward, adds it to inventory, and advances to the next level", () => {
  let state = createInitialGame("choose-reward", {
    config: {
      startingStats: {
        agility: 20,
        intellect: 20,
        spirit: 20,
        strength: 20,
      },
    },
  });

  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;

  const reward = state.pendingRewards[0]!;
  const result = chooseReward(state, reward.id);

  assert.equal(result.reward.id, reward.id);
  assert.equal(result.state.level, 2);
  assert.equal(result.state.encounterIndex, 0);
  assert.equal(result.state.status, "playing");
  assert.equal(result.state.phase, "encounter");
  assert.deepEqual(result.state.pendingRewards, []);
  assert.equal(result.state.character.inventory.length, 1);
  assert.equal(result.state.character.inventory[0]?.id, reward.item.id);
  assert.equal(result.state.history.at(-1)?.text, `Level 1 reward: kept ${reward.item.name}.`);
});

test("rejects unavailable rewards", () => {
  let state = createInitialGame("bad-reward", {
    config: {
      startingStats: {
        agility: 20,
        intellect: 20,
        spirit: 20,
        strength: 20,
      },
    },
  });

  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;
  state = resolveChoice(state, "strength").state;

  assert.throws(() => {
    chooseReward(state, "missing_reward");
  }, /is not currently available/);
});

test("equips an owned item and applies its effective stat bonus", () => {
  const item = defaultGameContent.items.find((candidate) => candidate.id === "iron_gauntlets")!;
  const state = {
    ...createInitialGame("equip-owned"),
    character: {
      ...createInitialGame("equip-owned").character,
      inventory: [item],
    },
  };
  const result = equipItem(state, item.id);

  assert.equal(result.item.id, item.id);
  assert.equal(result.replacedItem, null);
  assert.equal(result.state.character.equipment.weapon?.id, item.id);
  assert.equal(getEffectiveStat(result.state.character, "strength"), 3);
});

test("replaces equipped items in the same slot without deleting ownership", () => {
  const ironGauntlets = defaultGameContent.items.find(
    (candidate) => candidate.id === "iron_gauntlets",
  )!;
  const breakerBlade = defaultGameContent.items.find(
    (candidate) => candidate.id === "breaker_blade",
  )!;
  const baseState = createInitialGame("equip-replace");
  const state = {
    ...baseState,
    character: {
      ...baseState.character,
      inventory: [ironGauntlets, breakerBlade],
    },
  };

  const first = equipItem(state, ironGauntlets.id).state;
  const second = equipItem(first, breakerBlade.id);

  assert.equal(second.replacedItem?.id, ironGauntlets.id);
  assert.equal(second.state.character.equipment.weapon?.id, breakerBlade.id);
  assert.deepEqual(
    second.state.character.inventory.map((item) => item.id),
    [ironGauntlets.id, breakerBlade.id],
  );
  assert.equal(getEffectiveStat(second.state.character, "strength"), 4);
});

test("rejects equipping unowned items", () => {
  const state = createInitialGame("unowned-equip");

  assert.throws(() => {
    equipItem(state, "iron_gauntlets");
  }, /is not owned/);
});

test("keeps an undefeated boss active after a failed boss check", () => {
  const state = {
    ...createInitialGame("boss-retry"),
    encounterIndex: 2,
    level: 5,
  };
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, false);
  assert.equal(result.outcome.bossEncounter, true);
  assert.equal(result.outcome.healthDelta, -2);
  assert.equal(result.state.character.health, 8);
  assert.equal(result.state.level, 5);
  assert.equal(result.state.encounterIndex, 2);
  assert.equal(result.state.status, "playing");
});

test("ends the game when a boss failure reduces health to zero", () => {
  const baseState = createInitialGame("boss-death");
  const state = {
    ...baseState,
    character: {
      ...baseState.character,
      health: 2,
    },
    encounterIndex: 2,
    level: 5,
  };
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, false);
  assert.equal(result.outcome.gameEnded, true);
  assert.equal(result.state.character.health, 0);
  assert.equal(result.state.phase, "complete");
  assert.equal(result.state.status, "lost");
});

test("defeats a non-final boss, grants boss stat gain, heals, and opens rewards", () => {
  const baseState = createInitialGame("boss-success", {
    config: {
      startingStats: {
        strength: 9,
      },
    },
  });
  const state = {
    ...baseState,
    character: {
      ...baseState.character,
      health: 6,
    },
    encounterIndex: 2,
    level: 5,
  };
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, true);
  assert.equal(result.outcome.bossDefeated, true);
  assert.equal(result.outcome.statGain, 2);
  assert.equal(result.outcome.healthDelta, 2);
  assert.equal(result.state.character.baseStats.strength, 11);
  assert.equal(result.state.character.health, 8);
  assert.equal(result.state.level, 5);
  assert.equal(result.state.encounterIndex, 2);
  assert.equal(result.state.pendingRewards.length, 3);
  assert.equal(result.state.phase, "reward");
  assert.equal(result.state.status, "reward");
});

test("wins the game after the final boss is defeated", () => {
  const baseState = createInitialGame("final-victory", {
    config: {
      startingStats: {
        strength: 24,
      },
    },
  });
  const state = {
    ...baseState,
    character: {
      ...baseState.character,
      health: 5,
    },
    encounterIndex: 2,
    level: 20,
  };
  const result = resolveChoice(state, "strength");

  assert.equal(result.outcome.success, true);
  assert.equal(result.outcome.gameEnded, true);
  assert.equal(result.state.character.baseStats.strength, 26);
  assert.equal(result.state.character.health, 7);
  assert.equal(result.state.phase, "complete");
  assert.equal(result.state.status, "won");
});

test("rejects resolution after the game has already ended", () => {
  const state = {
    ...createInitialGame("already-ended"),
    phase: "complete" as const,
    status: "won" as const,
  };

  assert.throws(() => {
    resolveChoice(state, "strength");
  }, /Cannot resolve a choice/);
});

test("simulates deterministic focused builds that can finish the full game", () => {
  for (const stat of statIds) {
    const first = simulateGame({
      seed: `focused-${stat}`,
      strategy: createFocusedStrategy(stat),
    });
    const second = simulateGame({
      seed: `focused-${stat}`,
      strategy: createFocusedStrategy(stat),
    });

    assert.equal(first.state.status, "won");
    assert.equal(first.encounterCount, 60);
    assert.equal(first.rewardCount, 19);
    assert.equal(first.bossFailures, 0);
    assert.deepEqual(getSimulationEffectiveStats(first), getSimulationEffectiveStats(second));
    assert.equal(second.state.status, "won");
  }
});

test("simulates highest-effective-stat strategy through victory", () => {
  const result = simulateGame({
    seed: "highest-effective",
    strategy: highestEffectiveStatStrategy,
  });

  assert.equal(result.state.status, "won");
  assert.equal(result.failures, 0);
  assert.equal(result.encounterCount, 60);
  assert.equal(result.rewardCount, 19);
});

test("summarizes focused strategy batches across many seeds", () => {
  for (const stat of statIds) {
    const summary = simulateStrategyBatch({
      seeds: balanceSeeds,
      strategy: () => createFocusedStrategy(stat),
    });

    assert.equal(summary.seedCount, balanceSeeds.length);
    assert.ok(summary.winRate >= 0.8);
    assert.ok(summary.averageFailures > 0);
    assert.ok(summary.averageRemainingHealth > 0);
    assert.equal(summary.choiceCounts[stat], summary.averageEncounterCount * summary.seedCount);
  }
});

test("summarizes highest-effective-stat strategy as the reliable baseline", () => {
  const summary = simulateStrategyBatch({
    seeds: balanceSeeds,
    strategy: highestEffectiveStatStrategy,
  });

  assert.ok(summary.winRate >= 0.9);
  assert.equal(summary.lossCount, 0);
  assert.ok(summary.averageFailures <= 1);
  assert.equal(summary.averageEncounterCount, 60);
});

test("summarizes seeded random strategy as unreliable", () => {
  const summary = simulateStrategyBatch({
    seeds: balanceSeeds,
    strategy: createSeededRandomStrategy,
  });

  assert.ok(summary.winRate < 0.9);
  assert.ok(summary.averageFailures > 0);
  assert.ok(Object.values(summary.failedLevels).some((count) => count > 0));

  for (const stat of statIds) {
    assert.ok(summary.choiceCounts[stat] > 0);
  }
});

test("summarizes evenly mixed play separately from focused builds", () => {
  const summary = simulateStrategyBatch({
    seeds: balanceSeeds,
    strategy: () => createCyclicStatStrategy(),
  });

  assert.equal(summary.strategyId, "cyclic_strength_intellect_agility_spirit");
  assert.ok(summary.averageFailures > 0);
  assert.ok(summary.winRate < 1);
});

test("keeps runtime client imports out of legacy TS RPG modules", () => {
  const root = resolve(__dirname, "..");
  const sourceRoot = resolve(root, "src");
  const checkedFiles = listSourceFiles(sourceRoot)
    .filter((filePath) => !relative(sourceRoot, filePath).startsWith("lib/rpg/"));
  const violations = checkedFiles.filter((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return importsLegacyRpg(source);
  });

  assert.deepEqual(
    violations.map((filePath) => relative(root, filePath)),
    [],
  );
});

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = resolve(directory, entry);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      return listSourceFiles(filePath);
    }
    return /\.(ts|tsx)$/.test(filePath) ? [filePath] : [];
  });
}

function importsLegacyRpg(source: string): boolean {
  return /(?:from|import)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']@\/lib\/rpg(?:\/|["'])/.test(source)
    || /(?:from|import)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["'](?:\.\.\/)+rpg(?:\/|["'])/.test(source)
    || /(?:from|import)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']\.\/lib\/rpg(?:\/|["'])/.test(source);
}

let passed = 0;

for (const { name, run } of tests) {
  try {
    run();
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } catch (error) {
    console.error(`not ok ${passed + 1} - ${name}`);
    throw error;
  }
}

console.log(`${passed}/${tests.length} tests passed`);
