import { useEffect, useState } from "react";

import type { ChoiceLogView, RunBundle } from "@/lib/chain/state";
import {
  dismissActIntro,
  getNarrativeBeat,
  hasDismissedActIntro,
  type NarrativeBeat,
} from "@/lib/game/narrative";
import { storyText } from "@/lib/rpgContent/generatedText";

export function NarrativeBeatBanner({
  bundle,
  latestLog,
}: {
  bundle: RunBundle;
  latestLog: ChoiceLogView | null;
}) {
  const beat = getNarrativeBeat(bundle, latestLog);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [bundle.run.id, bundle.run.level, bundle.run.phase, bundle.run.encounterIndex]);

  useEffect(() => {
    if (!beat || beat.kind !== "act_intro") return;
    setDismissed(hasDismissedActIntro(bundle.run.id, beat.act));
  }, [beat, bundle.run.id]);

  if (!beat || dismissed) return null;

  const copy = getBeatCopy(beat);

  function handleDismiss() {
    if (beat?.kind === "act_intro") {
      dismissActIntro(bundle.run.id, beat.act);
    }
    setDismissed(true);
  }

  return (
    <aside aria-label={copy.title} className={`narrative-beat narrative-beat-${beat.kind}`}>
      <div>
        <b>{copy.title}</b>
        <p>{copy.description}</p>
      </div>
      {beat.kind === "act_intro" ? (
        <button onClick={handleDismiss} type="button">
          Continue
        </button>
      ) : null}
    </aside>
  );
}

function getBeatCopy(beat: NarrativeBeat): { description: string; title: string } {
  switch (beat.kind) {
    case "act_intro":
      return storyText.actIntros[String(beat.act) as "1" | "2" | "3" | "4"];
    case "boss_defeated":
      return {
        description: storyText.bossDefeatedDescription,
        title: storyText.bossDefeatedTitle,
      };
    case "level_cleared":
      return {
        description: storyText.levelClearedDescription,
        title: storyText.levelClearedTitle,
      };
  }
}
