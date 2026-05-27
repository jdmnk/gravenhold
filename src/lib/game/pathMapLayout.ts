import { getBossEncounterId } from "@/lib/game/runDisplay";

export const PATH_MAP_TRACK_WIDTH_PX = 360;
export const PATH_MAP_SEGMENT_HEIGHT_PX = 80;
export const PATH_MAP_NODE_OFFSET_PX = 36;
export const PATH_MAP_CIRCLE_SIZE_PX = 100;

/** Slight alternating horizontal offset from center (px). */
export function getPathMapNodeOffsetPx(level: number): number {
  return (level - 1) % 2 === 0 ? -PATH_MAP_NODE_OFFSET_PX : PATH_MAP_NODE_OFFSET_PX;
}

export const PATH_MAP_DASH_LENGTH = 5;
export const PATH_MAP_GAP_LENGTH = 6;

/** Connector anchor X in a 0–100 viewBox (50 = track center). */
export function pathMapNodeCenterX(level: number): number {
  return (
    50 +
    (getPathMapNodeOffsetPx(level) / PATH_MAP_TRACK_WIDTH_PX) * 100
  );
}

export function pathMapSegmentLength(
  fromX: number,
  toX: number,
  height: number = PATH_MAP_SEGMENT_HEIGHT_PX,
): number {
  return Math.hypot(toX - fromX, height);
}

export function pathMapSegmentDrawMs(length: number): number {
  return Math.round(240 + length * 11);
}

export function getLevelEncounterId(level: number): number {
  return getBossEncounterId(level) ?? level;
}

export function isBossLevel(level: number): boolean {
  return getBossEncounterId(level) !== null;
}

export function actForPathLevel(level: number): number {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 15) return 3;
  return 4;
}

export type PathMapSegmentState = "hidden" | "drawing" | "revealed";

export function getPathMapSegmentState(
  upperLevel: number,
  transition: { fromLevel: number; toLevel: number },
  travelPhase: "prepare" | "travel" | "complete",
): PathMapSegmentState {
  const { fromLevel, toLevel } = transition;

  if (upperLevel >= toLevel) {
    return "hidden";
  }

  if (fromLevel === 0) {
    return "hidden";
  }

  if (upperLevel < fromLevel) {
    return "revealed";
  }

  if (upperLevel === fromLevel) {
    if (travelPhase === "travel") {
      return "drawing";
    }
    if (travelPhase === "complete") {
      return "revealed";
    }
    return "hidden";
  }

  return "hidden";
}
