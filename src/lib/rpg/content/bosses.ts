import type { Encounter } from "../types";
import { createEncounterOptions } from "./helpers";

export const bossEncounters: Record<number, Encounter> = {
  5: {
    category: "boss",
    description: "The Stone Warden blocks the first gate with a body of carved granite.",
    difficulty: "boss",
    id: "boss_05_stone_warden",
    options: createEncounterOptions({
      agility: {
        description: "Move between its slow attacks and strike exposed joints.",
        label: "Strike joints",
      },
      intellect: {
        description: "Read the command marks and disrupt its control pattern.",
        label: "Break pattern",
      },
      spirit: {
        description: "Resist its fear aura and weaken the binding magic.",
        label: "Resist aura",
      },
      strength: {
        description: "Shatter its armor with repeated heavy strikes.",
        label: "Shatter armor",
      },
    }),
    title: "The Stone Warden",
  },
  10: {
    category: "boss",
    description: "The Glass Regent reflects every hesitation back as a sharper threat.",
    difficulty: "boss",
    id: "boss_10_glass_regent",
    options: createEncounterOptions({
      agility: {
        description: "Move faster than the reflections can correct.",
        label: "Outpace mirrors",
      },
      intellect: {
        description: "Identify the true body among the false images.",
        label: "Find true form",
      },
      spirit: {
        description: "Hold your identity while the reflections try to split it.",
        label: "Remain whole",
      },
      strength: {
        description: "Break the mirror shell before it multiplies again.",
        label: "Break shell",
      },
    }),
    title: "The Glass Regent",
  },
  15: {
    category: "boss",
    description: "The Ash Titan waits where the mountain burns from within.",
    difficulty: "boss",
    id: "boss_15_ash_titan",
    options: createEncounterOptions({
      agility: {
        description: "Strike during the small openings between eruptions.",
        label: "Thread eruptions",
      },
      intellect: {
        description: "Turn the vents beneath it into a trap.",
        label: "Reroute vents",
      },
      spirit: {
        description: "Withstand the heat and deny its command of fear.",
        label: "Defy flame",
      },
      strength: {
        description: "Meet its crushing blows until its stance fails.",
        label: "Break stance",
      },
    }),
    title: "The Ash Titan",
  },
  20: {
    category: "boss",
    description: "The Crownless Star tests the shape your choices have made.",
    difficulty: "boss",
    id: "boss_20_crownless_star",
    options: createEncounterOptions({
      agility: {
        description: "Move through impossible angles and strike the opening.",
        label: "Cross angles",
      },
      intellect: {
        description: "Solve the final pattern hidden across every prior trial.",
        label: "Solve final law",
      },
      spirit: {
        description: "Stand as yourself against the pressure of the star.",
        label: "Hold self",
      },
      strength: {
        description: "Carry the full weight of the path and force an ending.",
        label: "Force ending",
      },
    }),
    title: "The Crownless Star",
  },
};
