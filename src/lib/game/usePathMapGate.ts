import { useEffect, useRef, useState } from "react";

import type { RunBundle } from "@/lib/chain/state";

export type PathMapTransition = {
  fromLevel: number;
  toLevel: number;
};

export function usePathMapGate(bundle: RunBundle): {
  mapTransition: PathMapTransition | null;
  dismissMap: () => void;
} {
  const [mapTransition, setMapTransition] = useState<PathMapTransition | null>(null);
  const enteredLevelsRef = useRef<Set<number>>(new Set());
  const runIdRef = useRef(bundle.run.id);

  useEffect(() => {
    if (runIdRef.current !== bundle.run.id) {
      runIdRef.current = bundle.run.id;
      enteredLevelsRef.current = new Set();
      setMapTransition(null);
    }
  }, [bundle.run.id]);

  useEffect(() => {
    if (bundle.run.status !== "playing") return;
    if (bundle.run.phase !== "encounter") return;
    if (bundle.run.encounterIndex !== 0) return;

    const level = bundle.run.level;
    if (enteredLevelsRef.current.has(level)) return;

    const fromLevel =
      enteredLevelsRef.current.size === 0 && level === 1 ? 0 : level - 1;

    setMapTransition({ fromLevel, toLevel: level });
  }, [
    bundle.run.encounterIndex,
    bundle.run.level,
    bundle.run.phase,
    bundle.run.status,
  ]);

  function dismissMap() {
    if (!mapTransition) return;
    enteredLevelsRef.current.add(mapTransition.toLevel);
    setMapTransition(null);
  }

  return { dismissMap, mapTransition };
}
