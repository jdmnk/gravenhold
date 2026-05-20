export type SceneEffectProfile =
  | "boss"
  | "defeat"
  | "intro"
  | "reward"
  | "victory";

export function SceneEffectsLayer({
  profile,
}: {
  profile: SceneEffectProfile;
}) {
  return (
    <div aria-hidden="true" className={`scene-fx scene-fx-${profile}`}>
      <span className="scene-fx-glow scene-fx-glow-left" />
      <span className="scene-fx-glow scene-fx-glow-right" />
      <span className="scene-fx-fog scene-fx-fog-a" />
      <span className="scene-fx-fog scene-fx-fog-b" />
      <span className="scene-fx-particle scene-fx-particle-1" />
      <span className="scene-fx-particle scene-fx-particle-2" />
      <span className="scene-fx-particle scene-fx-particle-3" />
      <span className="scene-fx-particle scene-fx-particle-4" />
      <span className="scene-fx-particle scene-fx-particle-5" />
      <span className="scene-fx-particle scene-fx-particle-6" />
      <span className="scene-fx-particle scene-fx-particle-7" />
      <span className="scene-fx-particle scene-fx-particle-8" />
    </div>
  );
}
