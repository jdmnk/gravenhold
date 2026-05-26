import { skillText, type SkillId } from "@/lib/rpgContent/classes";

export type PendingAction =
  | { kind: "start" }
  | { kind: "resume" }
  | { kind: "choice"; skillId: SkillId }
  | { kind: "growth"; skillId: SkillId | null }
  | { equipNow: boolean; kind: "reward"; rewardIndex: number }
  | { itemId: number; kind: "equip" };

export function getPendingActionLabel(action: PendingAction): string {
  switch (action.kind) {
    case "start":
      return "Starting run...";
    case "resume":
      return "Resuming run...";
    case "choice":
      return `Using ${skillText[action.skillId].label}...`;
    case "growth":
      return action.skillId
        ? `Learning ${skillText[action.skillId].label}...`
        : "Confirming growth...";
    case "reward":
      return action.equipNow ? "Equipping drop..." : "Picking up drop...";
    case "equip":
      return "Equipping item...";
  }
}
