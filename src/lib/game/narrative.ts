import type { ChoiceLogView, RunBundle } from "@/lib/chain/state";

export type ActId = 1 | 2 | 3 | 4;

const actStartLevels: Record<ActId, number> = {
  1: 1,
  2: 6,
  3: 11,
  4: 16,
};

export function actForLevel(level: number): ActId | null {
  if (level === 1) return 1;
  if (level === 6) return 2;
  if (level === 11) return 3;
  if (level === 16) return 4;
  return null;
}

export function shouldShowActIntro(bundle: RunBundle): ActId | null {
  const act = actForLevel(bundle.run.level);
  if (!act) return null;
  if (bundle.run.phase !== "encounter") return null;
  if (bundle.run.encounterIndex !== 0) return null;
  return act;
}

export type NarrativeBeatKind = "act_intro" | "boss_defeated" | "level_cleared";

export type NarrativeBeat =
  | { act: ActId; kind: "act_intro" }
  | { kind: "boss_defeated" }
  | { kind: "level_cleared" };

export function getNarrativeBeat(
  bundle: RunBundle,
  latestLog: ChoiceLogView | null,
): NarrativeBeat | null {
  if (bundle.run.phase === "reward" && latestLog) {
    if (latestLog.bossDefeated) return { kind: "boss_defeated" };
    if (latestLog.completedLevel) return { kind: "level_cleared" };
  }

  const act = shouldShowActIntro(bundle);
  if (act) return { act, kind: "act_intro" };

  return null;
}

export function actIntroStorageKey(runId: bigint, act: ActId): string {
  return `gravenhold-act-intro-${runId.toString()}-${act}`;
}

export function hasDismissedActIntro(runId: bigint, act: ActId): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(actIntroStorageKey(runId, act)) === "1";
}

export function dismissActIntro(runId: bigint, act: ActId): void {
  window.localStorage.setItem(actIntroStorageKey(runId, act), "1");
}

export function actLabel(act: ActId): string {
  return `Act ${act}`;
}

export { actStartLevels };
