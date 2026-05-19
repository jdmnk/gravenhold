export type HowItWorksSection = {
  body: string;
  title: string;
};

export const howItWorksSections: HowItWorksSection[] = [
  {
    title: "Goal",
    body: "Clear 20 levels before your health runs out. Boss gates appear at levels 5, 10, 15, and 20.",
  },
  {
    title: "Encounters",
    body: "Each encounter offers four approaches: Strength, Intellect, Agility, and Spirit. Pick the approach that fits your build and the current threat.",
  },
  {
    title: "Checks",
    body: "A choice compares your effective stat against the encounter difficulty. Effective stats include your base stat plus equipped gear.",
  },
  {
    title: "Results",
    body: "Success can grow the chosen stat. Failure costs health. The choice card shows the check and the expected change before you commit.",
  },
  {
    title: "Strain",
    body: "Repeating the same stat builds strain. Strain can raise difficulty, reduce gains, and make failures hurt more.",
  },
  {
    title: "Gear",
    body: "After clearing a level, choose one item. Gear should reinforce your main stat or cover the weakness your next boss might punish.",
  },
  {
    title: "Bosses",
    body: "Bosses test more than your highest number. Your second-best effective stat matters, so a build with some support survives better.",
  },
];
