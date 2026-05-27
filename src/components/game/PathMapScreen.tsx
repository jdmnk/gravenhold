import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { encounterBackgroundFor } from "@/lib/assets/gameAssets";
import type { RunBundle } from "@/lib/chain/state";
import {
  actForPathLevel,
  getLevelEncounterId,
  getPathMapNodeOffsetPx,
  getPathMapSegmentState,
  isBossLevel,
  PATH_MAP_SEGMENT_HEIGHT_PX,
  pathMapNodeCenterX,
  type PathMapSegmentState,
} from "@/lib/game/pathMapLayout";
import { getEncounterText } from "@/lib/game/runDisplay";
import type { PathMapTransition } from "@/lib/game/usePathMapGate";

const segmentDrawMs = 850;
const travelLeadMs = 140;

type TravelPhase = "prepare" | "travel" | "complete";

type PathMapNode = {
  boss: boolean;
  cleared: boolean;
  current: boolean;
  highlight: boolean;
  image: string;
  level: number;
  offsetPx: number;
  title: string;
  visited: boolean;
};

export function PathMapScreen({
  bundle,
  transition,
  onContinue,
}: {
  bundle: RunBundle;
  transition: PathMapTransition;
  onContinue: () => void;
}) {
  const nodeRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const [travelPhase, setTravelPhase] = useState<TravelPhase>("prepare");
  const [travelComplete, setTravelComplete] = useState(false);

  const destinationText = getEncounterText(getLevelEncounterId(transition.toLevel));
  const animatesSegment = transition.fromLevel > 0;

  const nodes = useMemo<PathMapNode[]>(
    () =>
      Array.from({ length: 20 }, (_, index) => {
        const level = index + 1;
        const encounterId = getLevelEncounterId(level);
        const cleared =
          bundle.run.status === "won" || level < bundle.run.level;
        const isTarget = level === transition.toLevel;
        const visited = cleared || isTarget;
        const boss = isBossLevel(level);
        const highlight =
          isTarget && (travelPhase === "travel" || travelPhase === "complete");
        const current = isTarget && travelPhase === "complete";
        let title = `Level ${level}`;
        try {
          title = getEncounterText(encounterId).title;
        } catch {
          // fallback title
        }

        return {
          boss,
          cleared,
          current,
          highlight,
          image: encounterBackgroundFor(level),
          level,
          offsetPx: getPathMapNodeOffsetPx(level),
          title,
          visited,
        };
      }),
    [bundle.run.level, bundle.run.status, transition.toLevel, travelPhase],
  );

  useEffect(() => {
    setTravelPhase("prepare");
    setTravelComplete(false);

    const scrollToLevel = (level: number, behavior: ScrollBehavior) => {
      nodeRefs.current.get(level)?.scrollIntoView({ behavior, block: "center" });
    };

    const startLevel = transition.fromLevel === 0 ? 1 : transition.fromLevel;
    scrollToLevel(startLevel, "instant");

    const travelTimer = window.setTimeout(() => {
      setTravelPhase("travel");
      scrollToLevel(transition.toLevel, "smooth");
    }, travelLeadMs);

    const completeDelay = animatesSegment
      ? travelLeadMs + segmentDrawMs + 180
      : travelLeadMs + 520;

    const completeTimer = window.setTimeout(() => {
      setTravelPhase("complete");
      setTravelComplete(true);
    }, completeDelay);

    return () => {
      window.clearTimeout(travelTimer);
      window.clearTimeout(completeTimer);
    };
  }, [animatesSegment, transition.fromLevel, transition.toLevel]);

  return (
    <section aria-label="Path map" className="path-map-screen">
      <div className="path-map-screen-inner">
        <header className="path-map-header">
          <p className="path-map-act">Act {actForPathLevel(transition.toLevel)}</p>
          <h2>The Path</h2>
          <p>
            {travelComplete
              ? `Level ${transition.toLevel}: ${destinationText.title}`
              : transition.fromLevel === 0
                ? "Leaving the gate..."
                : `Traveling to level ${transition.toLevel}...`}
          </p>
        </header>

        <div className="path-map-scroll">
          <ol className="path-map-list">
            {nodes.map((node, index) => {
              const previous = index > 0 ? nodes[index - 1]! : null;
              const segmentState = previous
                ? getPathMapSegmentState(previous.level, transition, travelPhase)
                : null;
              const nodeStyle = {
                "--path-offset": `${node.offsetPx}px`,
              } as CSSProperties;

              return (
                <li
                  aria-current={node.current ? "step" : undefined}
                  className={[
                    "path-map-item",
                    node.boss ? "is-boss" : "",
                    node.visited ? "is-visited" : "",
                    node.cleared ? "is-cleared" : "",
                    node.highlight ? "is-highlighting" : "",
                    node.current ? "is-current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={node.level}
                  ref={(element) => {
                    if (element) {
                      nodeRefs.current.set(node.level, element);
                    } else {
                      nodeRefs.current.delete(node.level);
                    }
                  }}
                >
                  {previous && segmentState ? (
                    <PathMapSegment
                      lowerLevel={node.level}
                      state={segmentState}
                      upperLevel={previous.level}
                    />
                  ) : null}

                  <div className="path-map-node" style={nodeStyle}>
                    <div className="path-map-node-track">
                      <div className="path-map-node-circle">
                        <img alt="" src={node.image} />
                        <span className="path-map-node-level">{node.level}</span>
                      </div>
                    </div>
                    <p className="path-map-node-title">{node.title}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className="path-map-footer">
          <button disabled={!travelComplete} onClick={onContinue} type="button">
            {travelComplete ? `Enter level ${transition.toLevel}` : "Traveling..."}
          </button>
        </footer>
      </div>
    </section>
  );
}

function PathMapSegment({
  upperLevel,
  lowerLevel,
  state,
}: {
  upperLevel: number;
  lowerLevel: number;
  state: PathMapSegmentState;
}) {
  const fromX = pathMapNodeCenterX(upperLevel);
  const toX = pathMapNodeCenterX(lowerLevel);
  const segmentHeight = PATH_MAP_SEGMENT_HEIGHT_PX;

  return (
    <svg
      aria-hidden="true"
      className={["path-map-segment", `is-${state}`].join(" ")}
      preserveAspectRatio="none"
      viewBox={`0 0 100 ${segmentHeight}`}
    >
      <line x1={fromX} x2={toX} y1="0" y2={String(segmentHeight)} />
    </svg>
  );
}
