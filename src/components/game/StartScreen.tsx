import { SceneEffectsLayer } from "@/components/fx/SceneEffectsLayer";
import { type GravenholdNetwork } from "@/lib/chain/networkConfig";
import { formatNetworkBadge } from "@/lib/game/runDisplay";
import { statClass } from "@/lib/game/statUi";
import { classIds, classText, type ClassId } from "@/lib/rpgContent/classes";
import { storyText } from "@/lib/rpgContent/generatedText";

export function BootLoaderPanel({ network }: { network: GravenholdNetwork | null }) {
  return (
    <section aria-label="Loading active run" className="start-screen">
      <SceneEffectsLayer profile="intro" />
      <p className="network-line">
        {network ? formatNetworkBadge(network) : "Network unavailable"}
      </p>
      <h1>{storyText.title}</h1>
      <p>Checking active run...</p>
    </section>
  );
}

function IntroMeta({
  network,
  seedInput,
  showLocalSeed,
  onSeedInputChange,
}: {
  network: GravenholdNetwork | null;
  seedInput: string;
  showLocalSeed: boolean;
  onSeedInputChange: (value: string) => void;
}) {
  return (
    <details className="intro-meta">
      <summary>{network ? formatNetworkBadge(network) : "Network unavailable"}</summary>
      <div className="intro-meta-panel">
        <p>{network ? network.chainId : "No chain configured"}</p>
        {showLocalSeed ? (
          <label>
            Seed
            <input
              value={seedInput}
              onChange={(event) => onSeedInputChange(event.target.value)}
            />
          </label>
        ) : null}
      </div>
    </details>
  );
}

export function StartPanel({
  busy,
  connectingSession,
  network,
  seedInput,
  selectedClass,
  showLocalSeed,
  walletMode,
  onResumeRun,
  onSeedInputChange,
  onSelectedClassChange,
  onShowHowItWorks,
  onStartRun,
}: {
  busy: boolean;
  connectingSession: boolean;
  network: GravenholdNetwork | null;
  seedInput: string;
  selectedClass: ClassId;
  showLocalSeed: boolean;
  walletMode: boolean;
  onResumeRun: () => void;
  onSeedInputChange: (value: string) => void;
  onSelectedClassChange: (classId: ClassId) => void;
  onShowHowItWorks: () => void;
  onStartRun: () => void;
}) {
  return (
    <section aria-label="Start run" className="start-screen">
      <SceneEffectsLayer profile="intro" />
      <IntroMeta
        network={network}
        seedInput={seedInput}
        showLocalSeed={showLocalSeed}
        onSeedInputChange={onSeedInputChange}
      />
      <h1 className="intro-title">{storyText.title}</h1>
      <p className="intro-subtitle">{storyText.subtitle}</p>
      <p className="intro-copy">{storyText.intro}</p>

      <section aria-label="Choose class" className="class-select-grid">
        {classIds.map((classId) => {
          const text = classText[classId];
          return (
            <button
              aria-pressed={selectedClass === classId}
              className={`class-choice stat-tone ${statClass(text.stat)}`}
              key={classId}
              onClick={() => onSelectedClassChange(classId)}
              type="button"
            >
              <b>{text.label}</b>
              <span>{text.description}</span>
            </button>
          );
        })}
      </section>

      <form
        className="intro-actions"
        onSubmit={(event) => {
          event.preventDefault();
          onStartRun();
        }}
      >
        {walletMode ? (
          <button
            disabled={busy || connectingSession || !network}
            onClick={onResumeRun}
            type="button"
          >
            {connectingSession ? "Connecting..." : busy ? "Loading..." : "Continue run"}
          </button>
        ) : null}
        <button disabled={busy || connectingSession || !network} type="submit">
          {connectingSession
            ? "Connecting..."
            : busy
              ? "Starting..."
              : walletMode
                ? "New run"
                : "Start"}
        </button>
        <button onClick={onShowHowItWorks} type="button">
          How it works
        </button>
      </form>
      {walletMode ? (
        <p className="intro-resume-note">
          Continue loads your active onchain run. New run replaces it.
        </p>
      ) : null}
    </section>
  );
}
