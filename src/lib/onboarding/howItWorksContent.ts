export type HowItWorksScreen = {
  cues: string[];
  detail: string;
  title: string;
};

export const howItWorksScreens: HowItWorksScreen[] = [
  {
    title: "Choose how you answer danger",
    detail:
      "A run is a 20-level climb. Each level has three encounters, and each encounter offers four approaches.",
    cues: [
      "Strength breaks through force and endurance.",
      "Intellect wins through reasoning and tactics.",
      "Agility relies on speed, precision, and stealth.",
      "Spirit holds through willpower and mystic resistance.",
    ],
  },
  {
    title: "Read the check before you commit",
    detail:
      "Every choice compares your effective stat against the encounter difficulty. The card tells you if it should pass and what will change.",
    cues: [
      "Effective stat is base stat plus equipped gear.",
      "Passing can grow the stat you used.",
      "Failing costs health.",
      "Repeating one stat builds strain, which can make later checks harsher.",
    ],
  },
  {
    title: "Shape your build between gates",
    detail:
      "After clearing a level, take one reward and equip gear that supports the plan you are building toward.",
    cues: [
      "Specializing makes your best approach reliable.",
      "A support stat helps survive boss gates.",
      "Bosses wait at levels 5, 10, 15, and 20.",
      "Clear level 20 before your health runs out.",
    ],
  },
];
