export type HowItWorksScreen = {
  cues: string[];
  detail: string;
  title: string;
};

export const howItWorksScreens: HowItWorksScreen[] = [
  {
    title: "Choose a class and use its skills",
    detail:
      "A run is a 20-level climb. Pick a class, then solve each encounter with the skills you have learned.",
    cues: [
      "Vanguard breaks through force and endurance.",
      "Scholar wins through reasoning and tactics.",
      "Shade relies on speed, precision, and stealth.",
      "Oracle holds through willpower and mystic resistance.",
    ],
  },
  {
    title: "Read the check before you commit",
    detail:
      "Every skill compares its effective stat against the encounter difficulty. The card tells you if it should pass and what will change.",
    cues: [
      "Effective stat is base stat plus equipped gear.",
      "Every encounter grants XP after it resolves.",
      "Failing costs health.",
      "Repeating one stat builds strain, which can make later checks harsher.",
    ],
  },
  {
    title: "Shape your build between gates",
    detail:
      "When XP levels you up, spend the skill point before continuing. After clearing a path level, choose one reward.",
    cues: [
      "Unlock class skills to expand your options.",
      "A support stat helps survive boss gates.",
      "Bosses wait at levels 5, 10, 15, and 20.",
      "Clear level 20 before your health runs out.",
    ],
  },
];
