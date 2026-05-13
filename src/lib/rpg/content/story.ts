import type { GameStory } from "../types";

export const story: GameStory = {
  actIntros: {
    1: {
      description:
        "The first gate teaches the shape of the path. Build a direction, take early gear, and learn which problems suit your approach.",
      title: "Act 1: The First Gate",
    },
    2: {
      description:
        "The road narrows after the Stone Warden. Your strongest stat should start feeling like a build, not just a preference.",
      title: "Act 2: The Mirror Road",
    },
    3: {
      description:
        "The mountain asks whether your gear and choices agree. Strained checks will punish wandering builds.",
      title: "Act 3: The Burning Pass",
    },
    4: {
      description:
        "The final ascent tests the identity you have made. Prepare for the last boss before the path stops giving room to recover.",
      title: "Act 4: The Starward Gate",
    },
  },
  bossDefeatedDescription:
    "A boss gate has fallen. Take a reward that strengthens the build that carried you here or covers the weakness the fight exposed.",
  bossDefeatedTitle: "Boss defeated",
  defeatDescription:
    "Your build could not carry you through this seed. Start again, specialize earlier, and let gear reinforce the stat that is winning checks.",
  defeatTitle: "The road claims another challenger.",
  intro:
    "Cross twenty escalating levels, solve each encounter through one of four stats, and shape a focused hero before the final gate tests the build you made.",
  levelClearedDescription:
    "Review how the level went, then choose one item. Gear should either push your main stat toward the next boss or solve a slot weakness.",
  levelClearedTitle: "Level cleared",
  subtitle: "A seeded progression RPG about choosing a playstyle and committing to it.",
  title: "Gravenhold",
  victoryDescription:
    "The last gate opens because your choices formed a coherent path. This seed is complete; the build survived every boss check.",
  victoryTitle: "The Crownless Star falls.",
};
