export const skillLaneLabels: Record<number, string> = {
  0: "Core",
  1: "Survival",
  2: "Power",
  3: "Bridge",
};

export function skillLaneLabel(tier: number): string {
  return skillLaneLabels[tier] ?? "Skill";
}
