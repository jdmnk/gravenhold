import * as Popover from "@radix-ui/react-popover";

import { CharacterPanel } from "@/components/game/CharacterColumn";
import { CompletePanel } from "@/components/game/CompletePanel";
import { EncounterPanel } from "@/components/game/EncounterPanel";
import { GrowthPanel } from "@/components/game/GrowthPanel";
import { PathMapScreen } from "@/components/game/PathMapScreen";
import { type GameSession } from "@/lib/chain/account/session";
import { type GravenholdNetwork } from "@/lib/chain/networkConfig";
import {
  formatDelta,
  type ChoiceLogView,
  type RewardOfferView,
  type RunBundle,
} from "@/lib/chain/state";
import { type GrowthAllocation } from "@/lib/chain/systems";
import { useGameAudio } from "@/lib/audio/useGameAudio";
import {
  getEncounterText,
  getHealthPercent,
  getLatestChoiceLog,
  getRunStepLabel,
  getXpPercent,
  getXpRequiredForLevel,
  shortAddress,
  stringifyBigInt,
} from "@/lib/game/runDisplay";
import {
  getPendingActionLabel,
  type PendingAction,
} from "@/lib/game/pendingAction";
import { usePathMapGate } from "@/lib/game/usePathMapGate";
import { classText, skillText, type SkillId } from "@/lib/rpgContent/classes";

export function GameConsole({
  bundle,
  busy,
  currentText,
  inventoryIds,
  network,
  pendingAction,
  seedInput,
  session,
  onAllocateGrowth,
  onChooseSkill,
  onEquip,
  onReward,
  onRestart,
  onSeedInputChange,
  onShowHowItWorks,
  onShowIntroScreen,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText> | null;
  inventoryIds: number[];
  network: GravenholdNetwork;
  pendingAction: PendingAction | null;
  seedInput: string;
  session: GameSession;
  onAllocateGrowth: (allocation: GrowthAllocation, skillId: SkillId | null) => void;
  onChooseSkill: (skillId: SkillId) => void;
  onEquip: (itemId: number) => void;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
  onRestart: () => void;
  onSeedInputChange: (value: string) => void;
  onShowHowItWorks: () => void;
  onShowIntroScreen: () => void;
}) {
  const pendingLabel = pendingAction ? getPendingActionLabel(pendingAction) : null;
  const phase = bundle.run.phase;
  const showingEncounter = Boolean(
    (phase === "encounter" || phase === "reward") &&
      bundle.currentEncounter &&
      currentText &&
      (phase === "reward" || bundle.forecasts),
  );
  const showingGrowth = phase === "growth";
  const showingComplete = phase === "complete";
  const latestLog = getLatestChoiceLog(bundle);
  const audio = useGameAudio();
  const scenePhase = phase === "encounter" || phase === "reward";
  const { dismissMap, mapTransition } = usePathMapGate(bundle);
  const mapOpen = mapTransition !== null;

  return (
    <section
      aria-label="Gravenhold game"
      className={["game-shell", `game-shell--${phase}`, mapOpen ? "game-shell--map" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={["top-strip", scenePhase ? "top-strip--compact" : ""].filter(Boolean).join(" ")}>
        <div className="game-mark">
          <span className="game-mark-title">Gravenhold</span>
          <span className="game-mark-class">{classText[bundle.character.classId].label}</span>
        </div>
        <RunSummary bundle={bundle} compact={scenePhase} />
        <div className="top-strip-actions">
          {scenePhase ? (
            <BuildPopover
              bundle={bundle}
              busy={busy}
              inventoryIds={inventoryIds}
              pendingAction={pendingAction}
              onEquip={onEquip}
            />
          ) : null}
          <OptionsPanel
            bundle={bundle}
            busy={busy}
            logs={bundle.recentChoices}
            network={network}
            seedInput={seedInput}
            session={session}
            musicEnabled={audio.musicEnabled}
            sfxEnabled={audio.sfxEnabled}
            onMusicEnabledChange={audio.setMusicEnabled}
            onRestart={onRestart}
            onSeedInputChange={onSeedInputChange}
            onShowHowItWorks={onShowHowItWorks}
            onShowIntroScreen={onShowIntroScreen}
            onSfxEnabledChange={audio.setSfxEnabled}
          />
        </div>
      </header>

      <section
        aria-hidden={mapOpen}
        aria-label="Main game layout"
        className={["game-layout", `game-layout--${phase}`, mapOpen ? "game-layout--hidden" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <section aria-label="Current state" className="center-column">
          {showingEncounter ? (
            <EncounterPanel
              bundle={bundle}
              busy={busy}
              currentText={currentText!}
              latestLog={latestLog}
              pendingAction={pendingAction}
              pendingLabel={pendingLabel}
              onReward={onReward}
              onChooseSkill={onChooseSkill}
              onChoiceClick={audio.playChoiceClick}
            />
          ) : null}

          {showingGrowth ? (
            <GrowthPanel
              bundle={bundle}
              busy={busy}
              pendingAction={pendingAction}
              pendingLabel={pendingLabel}
              onAllocateGrowth={onAllocateGrowth}
            />
          ) : null}

          {showingComplete ? (
            <CompletePanel
              bundle={bundle}
              busy={busy}
              latestLog={latestLog}
              pendingLabel={pendingLabel}
              onRestart={onRestart}
            />
          ) : null}
        </section>

        {!scenePhase && !showingComplete ? (
          <aside className="character-column">
            <CharacterPanel
              bundle={bundle}
              busy={busy}
              inventoryIds={inventoryIds}
              pendingAction={pendingAction}
              onEquip={onEquip}
            />
          </aside>
        ) : null}
      </section>

      {mapTransition ? (
        <PathMapScreen
          bundle={bundle}
          transition={mapTransition}
          onContinue={dismissMap}
        />
      ) : null}
    </section>
  );
}

function RunSummary({
  bundle,
  compact = false,
}: {
  bundle: RunBundle;
  compact?: boolean;
}) {
  const healthPercent = getHealthPercent(bundle);
  const xpRequired = getXpRequiredForLevel(bundle.character.xpLevel);
  const xpPercent = getXpPercent(bundle);

  if (compact) {
    return (
      <section aria-label="Run summary" className="run-summary run-summary--compact">
        <div className="run-summary-compact-block">
          <b>
            L{bundle.run.level} · {getRunStepLabel(bundle)}
          </b>
          <p>{bundle.run.choiceCount} choices made</p>
        </div>
        <div className="bar-block">
          <b>
            HP {bundle.character.health}/{bundle.character.maxHealth}
          </b>
          <div className="meter" aria-hidden="true">
            <div style={{ width: `${healthPercent}%` }} />
          </div>
        </div>
        <div className="bar-block">
          <b>XP {bundle.character.xpLevel}</b>
          <div className="meter progress-meter" aria-hidden="true">
            <div style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Run summary" className="run-summary">
      <div>
        <b>Level {bundle.run.level}</b>
        <p>
          Step {getRunStepLabel(bundle)} / {bundle.run.choiceCount} choices
        </p>
      </div>
      <div className="bar-block">
        <b>
          Health {bundle.character.health}/{bundle.character.maxHealth}
        </b>
        <div className="meter" aria-hidden="true">
          <div style={{ width: `${healthPercent}%` }} />
        </div>
      </div>
      <div className="bar-block">
        <b>XP Level {bundle.character.xpLevel}</b>
        <p>
          {bundle.character.xp}/{xpRequired} XP
          {bundle.character.skillPoints > 0
            ? ` / ${bundle.character.skillPoints} skill point`
            : ""}
          {bundle.character.statPoints > 0
            ? ` / ${bundle.character.statPoints} stat point`
            : ""}
        </p>
        <div className="meter progress-meter" aria-hidden="true">
          <div style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
    </section>
  );
}

function BuildPopover({
  bundle,
  busy,
  inventoryIds,
  pendingAction,
  onEquip,
}: {
  bundle: RunBundle;
  busy: boolean;
  inventoryIds: number[];
  pendingAction: PendingAction | null;
  onEquip: (itemId: number) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="chrome-trigger build-trigger" type="button">
          Build
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="build-popover"
          collisionPadding={10}
          side="bottom"
          sideOffset={8}
        >
          <CharacterPanel
            bundle={bundle}
            busy={busy}
            inventoryIds={inventoryIds}
            pendingAction={pendingAction}
            onEquip={onEquip}
          />
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function OptionsPanel({
  bundle,
  busy,
  logs,
  musicEnabled,
  network,
  seedInput,
  session,
  sfxEnabled,
  onMusicEnabledChange,
  onRestart,
  onSeedInputChange,
  onShowHowItWorks,
  onShowIntroScreen,
  onSfxEnabledChange,
}: {
  bundle: RunBundle;
  busy: boolean;
  logs: ChoiceLogView[];
  musicEnabled: boolean;
  network: GravenholdNetwork;
  seedInput: string;
  session: GameSession;
  sfxEnabled: boolean;
  onMusicEnabledChange: (enabled: boolean) => void;
  onRestart: () => void;
  onSeedInputChange: (value: string) => void;
  onShowHowItWorks: () => void;
  onShowIntroScreen: () => void;
  onSfxEnabledChange: (enabled: boolean) => void;
}) {
  const showDevControls =
    network.profile === "dev" || network.accountMode === "local";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="chrome-trigger options-trigger" type="button">
          Options
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="options-popover"
          collisionPadding={10}
          side="bottom"
          sideOffset={8}
        >
          <section aria-label="Options" className="options-panel">
            <p>Network: {network.chainId}</p>
            <p>
              {session.label}: {shortAddress(session.address)}
            </p>

            <div className="audio-options">
              <label>
                <input
                  checked={musicEnabled}
                  onChange={(event) => onMusicEnabledChange(event.target.checked)}
                  type="checkbox"
                />
                Music
              </label>
              <label>
                <input
                  checked={sfxEnabled}
                  onChange={(event) => onSfxEnabledChange(event.target.checked)}
                  type="checkbox"
                />
                Sound effects
              </label>
            </div>

            <button onClick={onShowHowItWorks} type="button">
              How it works
            </button>

            {showDevControls ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onRestart();
                }}
              >
                <label>
                  Seed{" "}
                  <input
                    value={seedInput}
                    onChange={(event) => onSeedInputChange(event.target.value)}
                  />
                </label>
                <button disabled={busy} type="submit">
                  New Run
                </button>
              </form>
            ) : null}

            {showDevControls ? (
              <button disabled={busy} onClick={onShowIntroScreen} type="button">
                Intro screen
              </button>
            ) : null}

            <HistoryPanel logs={logs} />
            {showDevControls ? <DebugPanel bundle={bundle} /> : null}
          </section>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HistoryPanel({ logs }: { logs: ChoiceLogView[] }) {
  return (
    <section aria-label="Log" className="history-panel">
      <h3>Log</h3>
      {logs.length === 0 ? <p>No actions yet.</p> : null}
      <ol>
        {logs.map((log) => {
          const encounter = getEncounterText(log.encounterId);
          return (
            <li key={`${log.runId}-${log.index}`}>
              L{log.level} {encounter.title}:{" "}
              {log.success ? "success" : "failure"} with{" "}
              {skillText[log.skillId].label}{" "}
              ({log.effectiveStat}/{log.difficulty})
              {log.xpGain > 0 ? `, +${log.xpGain} XP` : ""}
              {log.leveledUp ? `, XP level ${log.xpLevelAfter}` : ""}
              {log.healthDeltaAmount > 0
                ? `, ${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} HP`
                : ""}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DebugPanel({ bundle }: { bundle: RunBundle }) {
  const snapshot = {
    character: bundle.character,
    currentEncounter: bundle.currentEncounter,
    forecasts: bundle.forecasts,
    rewards: bundle.rewards,
    run: {
      choiceCount: bundle.run.choiceCount,
      encounterIndex: bundle.run.encounterIndex,
      level: bundle.run.level,
      pendingPhase: bundle.run.pendingPhase,
      phase: bundle.run.phase,
      runId: `0x${bundle.run.id.toString(16)}`,
      status: bundle.run.status,
    },
  };

  return (
    <details>
      <summary>Chain Debug</summary>
      <pre>{JSON.stringify(snapshot, stringifyBigInt, 2)}</pre>
    </details>
  );
}
