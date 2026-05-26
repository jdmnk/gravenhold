import {
  LatestResultBadge,
  ScenePendingOverlay,
} from "@/components/game/EncounterPanel";
import { SceneEffectsLayer } from "@/components/fx/SceneEffectsLayer";
import { gameOverBackground, levelClearedBackground } from "@/lib/assets/gameAssets";
import { type ChoiceLogView, type RunBundle } from "@/lib/chain/state";
import { choiceLogKey } from "@/lib/game/runDisplay";
import { storyText } from "@/lib/rpgContent/generatedText";

export function CompletePanel({
  bundle,
  busy,
  latestLog,
  pendingLabel,
  onRestart,
}: {
  bundle: RunBundle;
  busy: boolean;
  latestLog: ChoiceLogView | null;
  pendingLabel: string | null;
  onRestart: () => void;
}) {
  const won = bundle.run.status === "won";
  const background = won ? levelClearedBackground : gameOverBackground;
  const sceneProfile = won ? "victory" : "defeat";

  return (
    <section aria-label="Complete" className="complete-panel">
      <div
        className="complete-art"
        style={{ backgroundImage: `url(${background})` }}
      >
        <SceneEffectsLayer profile={sceneProfile} />
        {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
        <div className="scene-copy complete-copy">
          <h2>{won ? storyText.victoryTitle : storyText.defeatTitle}</h2>
          <p>
            {won ? storyText.victoryDescription : storyText.defeatDescription}
          </p>
        </div>
        {latestLog ? (
          <LatestResultBadge key={choiceLogKey(latestLog)} log={latestLog} />
        ) : null}
      </div>
      <button disabled={busy} onClick={onRestart} type="button">
        Restart
      </button>
    </section>
  );
}
