import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SceneEffectsLayer } from "@/components/fx/SceneEffectsLayer";
import { HowItWorksDialog } from "@/components/onboarding/HowItWorksDialog";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import {
  createGameSession,
  type GameSession,
} from "@/lib/chain/account/session";
import {
  encounterBackgroundFor,
  gameOverBackground,
  itemIconFor,
  levelClearedBackground,
} from "@/lib/assets/gameAssets";
import { getNetwork, type GravenholdNetwork } from "@/lib/chain/networkConfig";
import {
  allocateGrowth,
  chooseSkill,
  claimDrop,
  equipItem,
  startRun,
  type GrowthAllocation,
} from "@/lib/chain/systems";
import {
  equipmentSlots,
  formatDelta,
  inventoryItemIds,
  slotLabels,
  statIds,
  statLabels,
  statShortLabels,
  type ChoiceForecastView,
  type ChoiceLogView,
  type EncounterCategory,
  type EncounterDifficulty,
  type CurrentEncounterView,
  type EquipmentSlot,
  type ItemView,
  type RewardOfferView,
  type RunBundle,
  type StatId,
} from "@/lib/chain/state";
import { getActiveRunId, loadRunBundle } from "@/lib/chain/views";
import { useGameAudio } from "@/lib/audio/useGameAudio";
import {
  hasSeenHowItWorksIntro,
  markHowItWorksIntroSeen,
} from "@/lib/onboarding/onboardingState";
import {
  encounterText,
  itemText,
  storyText,
} from "@/lib/rpgContent/generatedText";
import {
  classIds,
  classText,
  isSkillUnlocked,
  skillPrerequisites,
  skillText,
  skillsForClass,
  type ClassId,
  type SkillId,
} from "@/lib/rpgContent/classes";

import "./App.css";

const defaultSeed = "aura-001";

const encounterCategoryLabels: Record<EncounterCategory, string> = {
  boss: "Boss",
  enemy: "Enemy",
  mystery: "Mystery",
  obstacle: "Obstacle",
  social: "Social",
  survival: "Survival",
};

const encounterDifficultyLabels: Record<EncounterDifficulty, string> = {
  boss: "Boss",
  hard: "Hard",
  normal: "Normal",
};

type ChainConnection =
  | {
      error: null;
      network: GravenholdNetwork;
    }
  | {
      error: string;
      network: null;
    };

type PendingAction =
  | { kind: "start" }
  | { kind: "choice"; skillId: SkillId }
  | { kind: "growth"; skillId: SkillId | null }
  | { equipNow: boolean; kind: "reward"; rewardIndex: number }
  | { itemId: number; kind: "equip" };

export default function Home() {
  const [seedInput, setSeedInput] = useState(defaultSeed);
  const [selectedClass, setSelectedClass] = useState<ClassId>("vanguard");
  const [connection] = useState<ChainConnection>(() => {
    try {
      return {
        error: null,
        network: getNetwork(),
      };
    } catch (error) {
      return {
        error: formatError(error),
        network: null,
      };
    }
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState(
    () => connection.network?.accountMode !== "local",
  );
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectingSession, setConnectingSession] = useState(false);
  const [bundle, setBundle] = useState<RunBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(() =>
    connection.error ? errorToast(connection.error) : null,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [hasSeenHowItWorks, setHasSeenHowItWorks] = useState(() =>
    hasSeenHowItWorksIntro(),
  );

  const { network } = connection;
  const showLocalSeed = Boolean(
    network && (network.profile === "dev" || network.accountMode === "local"),
  );

  const loadByRunId = useCallback(
    async (nextNetwork: GravenholdNetwork, runId: bigint) => {
      setBundle(await loadRunBundle(nextNetwork, runId));
    },
    [],
  );

  const loadActive = useCallback(
    async (nextNetwork: GravenholdNetwork, nextSession: GameSession) => {
      const runId = await getActiveRunId(nextNetwork, nextSession.address);
      if (runId === BigInt(0)) {
        setBundle(null);
        return;
      }

      await loadByRunId(nextNetwork, runId);
    },
    [loadByRunId],
  );

  const connectSession = useCallback(async (): Promise<GameSession | null> => {
    if (session) return session;
    if (!network || connectingSession) return null;
    setConnectingSession(true);
    setToast(null);

    try {
      const nextSession = await createGameSession(network);
      setSession(nextSession);
      return nextSession;
    } catch (error) {
      setToast(errorToast(formatError(error)));
      setInitialLoadComplete(true);
      return null;
    } finally {
      setConnectingSession(false);
    }
  }, [connectingSession, network, session]);

  useEffect(() => {
    if (
      !network ||
      session ||
      connectingSession ||
      network.accountMode !== "local"
    ) {
      return;
    }

    let cancelled = false;

    async function bootstrapLocalSession() {
      const nextSession = await connectSession();
      if (!nextSession && !cancelled) {
        setInitialLoadComplete(true);
      }
    }

    void bootstrapLocalSession();

    return () => {
      cancelled = true;
    };
  }, [connectSession, connectingSession, network, session]);

  useEffect(() => {
    if (!network) {
      setInitialLoadComplete(true);
      return;
    }
    if (!session) return;

    const activeNetwork = network;
    const activeSession = session;
    let cancelled = false;

    async function refreshActiveRun() {
      try {
        const runId = await getActiveRunId(
          activeNetwork,
          activeSession.address,
        );
        if (cancelled) return;

        if (runId === BigInt(0)) {
          setBundle(null);
          setInitialLoadComplete(true);
          return;
        }

        const nextBundle = await loadRunBundle(activeNetwork, runId);
        if (!cancelled) {
          setBundle(nextBundle);
          setInitialLoadComplete(true);
        }
      } catch (error) {
        if (!cancelled) {
          setToast(errorToast(formatError(error)));
          setInitialLoadComplete(true);
        }
      }
    }

    void refreshActiveRun();

    return () => {
      cancelled = true;
    };
  }, [network, session]);

  async function runAction(
    nextPendingAction: PendingAction,
    action: () => Promise<void>,
  ) {
    if (busy) return;
    setBusy(true);
    setPendingAction(nextPendingAction);
    setToast(null);

    try {
      await action();
    } catch (error) {
      setToast(errorToast(formatError(error)));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function handleStartRun() {
    void runAction({ kind: "start" }, async () => {
      if (!network) throw new Error("Chain account is not ready.");
      const activeSession = session ?? (await connectSession());
      if (!activeSession) throw new Error("Chain account is not ready.");
      const seed = showLocalSeed
        ? seedInput.trim() || defaultSeed
        : createRunSeed(network);
      await startRun(network, activeSession.signer, seed, selectedClass);
      await loadActive(network, activeSession);
      setToast({ message: "Onchain run started." });
    });
  }

  function handleChooseSkill(skillId: SkillId) {
    void runAction({ kind: "choice", skillId }, async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await chooseSkill(network, session.signer, bundle.run.id, skillId);
      await loadByRunId(network, bundle.run.id);
    });
  }

  function handleAllocateGrowth(allocation: GrowthAllocation, skillId: SkillId | null) {
    void runAction({ kind: "growth", skillId }, async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await allocateGrowth(network, session.signer, bundle.run.id, allocation, skillId);
      await loadByRunId(network, bundle.run.id);
    });
  }

  function handleReward(reward: RewardOfferView, equipNow: boolean) {
    void runAction(
      { equipNow, kind: "reward", rewardIndex: reward.index },
      async () => {
        if (!network || !session || !bundle)
          throw new Error("Run is not ready.");
        await claimDrop(
          network,
          session.signer,
          bundle.run.id,
          reward.index,
          equipNow,
        );
        await loadByRunId(network, bundle.run.id);
      },
    );
  }

  function handleEquip(itemId: number) {
    void runAction({ itemId, kind: "equip" }, async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await equipItem(network, session.signer, bundle.run.id, itemId);
      await loadByRunId(network, bundle.run.id);
    });
  }

  const currentText = bundle?.currentEncounter
    ? getEncounterText(bundle.currentEncounter.encounterId)
    : null;
  const inventoryIds = useMemo(
    () => inventoryItemIds(bundle?.character.inventoryBits ?? BigInt(0)),
    [bundle?.character.inventoryBits],
  );
  const showBootLoader = !initialLoadComplete && !bundle;

  useEffect(() => {
    if (showBootLoader || !bundle || hasSeenHowItWorks) return;
    setHowItWorksOpen(true);
  }, [bundle, hasSeenHowItWorks, showBootLoader]);

  function handleHowItWorksOpenChange(open: boolean) {
    setHowItWorksOpen(open);
    if (open) return;
    markHowItWorksIntroSeen();
    setHasSeenHowItWorks(true);
  }

  function handleShowIntroScreen() {
    markHowItWorksIntroSeen();
    setHasSeenHowItWorks(true);
    setHowItWorksOpen(false);
    setPendingAction(null);
    setToast(null);
    setInitialLoadComplete(true);
    setBundle(null);
  }

  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={150}>
      <main className="app-root">
        {showBootLoader ? <BootLoaderPanel network={network} /> : null}

        {!showBootLoader && !bundle ? (
          <StartPanel
            busy={busy}
            connectingSession={connectingSession}
            network={network}
            seedInput={seedInput}
            selectedClass={selectedClass}
            showLocalSeed={showLocalSeed}
            onSeedInputChange={setSeedInput}
            onSelectedClassChange={setSelectedClass}
            onShowHowItWorks={() => setHowItWorksOpen(true)}
            onStartRun={handleStartRun}
          />
        ) : null}

        {bundle && network && session ? (
          <GameConsole
            bundle={bundle}
            busy={busy}
            currentText={currentText}
            inventoryIds={inventoryIds}
            network={network}
            pendingAction={pendingAction}
            seedInput={seedInput}
            session={session}
            onChooseSkill={handleChooseSkill}
            onAllocateGrowth={handleAllocateGrowth}
            onEquip={handleEquip}
            onReward={handleReward}
            onRestart={handleStartRun}
            onSeedInputChange={setSeedInput}
            onShowHowItWorks={() => setHowItWorksOpen(true)}
            onShowIntroScreen={handleShowIntroScreen}
          />
        ) : null}

        <HowItWorksDialog
          open={howItWorksOpen}
          onOpenChange={handleHowItWorksOpenChange}
        />

        {toast ? (
          <Toast
            autoDismissMs={toast.autoDismissMs}
            message={toast.message}
            onDismiss={dismissToast}
          />
        ) : null}
      </main>
    </Tooltip.Provider>
  );
}

function BootLoaderPanel({ network }: { network: GravenholdNetwork | null }) {
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

function StartPanel({
  busy,
  connectingSession,
  network,
  seedInput,
  selectedClass,
  showLocalSeed,
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
        <button disabled={busy || connectingSession || !network} type="submit">
          {connectingSession ? "Connecting..." : busy ? "Starting..." : "Start"}
        </button>
        <button onClick={onShowHowItWorks} type="button">
          How it works
        </button>
      </form>
    </section>
  );
}

function GameConsole({
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
  const showingEncounter = Boolean(
    bundle.run.phase === "encounter" &&
      bundle.currentEncounter &&
      currentText &&
      bundle.forecasts,
  );
  const showingGrowth = bundle.run.phase === "growth";
  const showingReward = bundle.run.phase === "reward";
  const showingComplete = bundle.run.phase === "complete";
  const latestLog = getLatestChoiceLog(bundle);
  const audio = useGameAudio();

  return (
    <section aria-label="Gravenhold game" className="game-shell">
      <header className="top-strip">
        <div className="game-mark">Gravenhold</div>
        <RunSummary bundle={bundle} />
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
      </header>

      <section aria-label="Main game layout" className="game-layout">
        <aside className="path-column">
          <ProgressionList bundle={bundle} />
        </aside>

        <section aria-label="Current state" className="center-column">
          {showingEncounter ? (
            <EncounterPanel
              bundle={bundle}
              busy={busy}
              currentText={currentText!}
              latestLog={latestLog}
              pendingLabel={pendingLabel}
              onChooseSkill={onChooseSkill}
              onChoiceClick={audio.playChoiceClick}
            />
          ) : null}

          {showingReward && currentText ? (
            <DropPanel
              bundle={bundle}
              busy={busy}
              currentText={currentText}
              latestLog={latestLog}
              pendingAction={pendingAction}
              pendingLabel={pendingLabel}
              onReward={onReward}
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

        <aside className="character-column">
          <CharacterPanel
            bundle={bundle}
            busy={busy}
            inventoryIds={inventoryIds}
            pendingAction={pendingAction}
            onEquip={onEquip}
          />
        </aside>
      </section>

    </section>
  );
}

function RunSummary({ bundle }: { bundle: RunBundle }) {
  const healthPercent = getHealthPercent(bundle);
  const xpRequired = getXpRequiredForLevel(bundle.character.xpLevel);
  const xpPercent = getXpPercent(bundle);

  return (
    <section aria-label="Run summary" className="run-summary">
      <div>
        <b>Level {bundle.run.level}</b>
        <p>Step {getRunStepLabel(bundle)} / {bundle.run.choiceCount} choices</p>
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
            <DebugPanel bundle={bundle} />
          </section>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProgressionList({ bundle }: { bundle: RunBundle }) {
  return (
    <section aria-label="Progression" className="stone-panel progression-panel">
      <h2>Progression</h2>
      <ol>
        {Array.from({ length: 20 }, (_, index) => {
          const level = index + 1;
          const bossEncounterId = getBossEncounterId(level);
          const text = getEncounterText(bossEncounterId ?? level);
          const completed = bundle.run.status === "won" || level < bundle.run.level;
          const current =
            level === bundle.run.level &&
            bundle.run.status !== "won" &&
            bundle.run.status !== "lost";

          return (
            <li
              aria-label={`${level}. ${text.title}${bossEncounterId ? ", boss" : ""}${current ? ", current" : ""}${completed ? ", cleared" : ""}`}
              className={[
                completed ? "is-cleared" : "",
                current ? "is-current" : "",
                bossEncounterId ? "is-boss" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={level}
              title={[
                bossEncounterId ? "Boss" : "",
                current ? "Current" : "",
                completed ? "Cleared" : "",
              ]
                .filter(Boolean)
                .join(" / ")}
            >
              <strong>
                {level}. {text.title}
              </strong>
              <span className="progression-markers">
                {bossEncounterId ? (
                  <ProgressionMarker className="marker-boss" label="Boss" />
                ) : null}
                {current ? (
                  <ProgressionMarker className="marker-current" label="Current" />
                ) : null}
                {completed ? (
                  <ProgressionMarker className="marker-cleared" label="Cleared" />
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ProgressionMarker({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <DescriptionTooltip content={label}>
      <span
        aria-label={label}
        className={`progression-marker ${className}`}
        role="img"
        tabIndex={0}
      />
    </DescriptionTooltip>
  );
}

function LatestResultBadge({ log }: { log: ChoiceLogView }) {
  return (
    <aside
      aria-label="Latest result"
      className={[
        "latest-result",
        "stat-tone",
        statClass(log.stat),
        log.success ? "result-success" : "result-fail",
      ].join(" ")}
    >
      <b>{log.success ? "Passed" : "Failed"}</b>
      <p>
        {statShortLabels[log.stat]} {log.effectiveStat}/{log.difficulty}
        {log.xpGain > 0 ? ` / +${log.xpGain} XP` : ""}
        {log.leveledUp ? ` / Level ${log.xpLevelAfter}` : ""}
        {log.healthDeltaAmount > 0
          ? ` / ${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} HP`
          : ""}
      </p>
    </aside>
  );
}

function choiceLogKey(log: ChoiceLogView) {
  return `${log.runId}-${log.index}`;
}

function EncounterPanel({
  bundle,
  busy,
  currentText,
  latestLog,
  pendingLabel,
  onChoiceClick,
  onChooseSkill,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText>;
  latestLog: ChoiceLogView | null;
  pendingLabel: string | null;
  onChoiceClick: () => void;
  onChooseSkill: (skillId: SkillId) => void;
}) {
  const current = bundle.currentEncounter!;
  const background = encounterBackgroundFor(current.encounterId);
  const isBoss = current.difficultyKind === "boss";
  const forecasts = Object.values(bundle.forecasts!);

  return (
    <section aria-label="Encounter" className="encounter-panel">
      <div
        className="encounter-art"
        style={{ backgroundImage: `url(${background})` }}
      >
        {isBoss ? <SceneEffectsLayer profile="boss" /> : null}
        {latestLog ? (
          <LatestResultBadge key={choiceLogKey(latestLog)} log={latestLog} />
        ) : null}
        <EncounterDetailsPopover
          baseDifficulty={current.baseDifficulty}
          category={encounterCategoryLabels[current.category]}
          difficulty={encounterDifficultyLabels[current.difficultyKind]}
        />
        {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
        <div className="scene-copy encounter-copy">
          <h2>{currentText.title}</h2>
          <p>{currentText.description}</p>
        </div>
      </div>

      <section aria-label="Choices" className="choice-grid">
        <h3>Choices</h3>
        {forecasts.map((forecast) => (
          <ChoiceButton
            busy={busy}
            forecast={forecast}
            key={forecast.skillId}
            secondaryStat={getChoiceSecondaryStat(bundle, forecast)}
            text={currentText.options[forecast.stat]}
            xpGain={getEncounterXp(current)}
            onChoiceClick={onChoiceClick}
            onChoose={onChooseSkill}
          />
        ))}
      </section>
    </section>
  );
}

function ScenePendingOverlay({ label }: { label: string }) {
  return (
    <section aria-label="Pending action" className="pending-panel">
      <p>{label}</p>
    </section>
  );
}

function EncounterDetailsPopover({
  baseDifficulty,
  category,
  difficulty,
}: {
  baseDifficulty: number;
  category: string;
  difficulty: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="chrome-trigger encounter-details-trigger" type="button">
          Details
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="encounter-details-popover"
          collisionPadding={10}
          side="bottom"
          sideOffset={6}
        >
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{category}</dd>
            </div>
            <div>
              <dt>Threat</dt>
              <dd>{difficulty}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{baseDifficulty}</dd>
            </div>
          </dl>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ChoiceButton({
  busy,
  forecast,
  secondaryStat,
  text,
  xpGain,
  onChoiceClick,
  onChoose,
}: {
  busy: boolean;
  forecast: ChoiceForecastView;
  secondaryStat: StatId | null;
  text: { description: string; label: string };
  xpGain: number;
  onChoiceClick: () => void;
  onChoose: (skillId: SkillId) => void;
}) {
  const stat = forecast.stat;
  const skill = skillText[forecast.skillId];
  const style = secondaryStat
    ? ({
        "--secondary-stat-color": statColorFor(secondaryStat),
      } as CSSProperties)
    : undefined;

  return (
    <article
      className={[
        "choice-card",
        "stat-tone",
        statClass(stat),
        secondaryStat ? "choice-card-dual-stat" : "",
        forecast.success ? "choice-likely" : "choice-danger",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className="choice-topline">
        <img
          alt=""
          className="stat-icon"
          height="56"
          src={statIconFor(stat)}
          width="56"
        />
        <h4>{skill.label}</h4>
        <b>{statShortLabels[stat]}</b>
      </div>
      <p className="choice-description">
        {skill.description} {text.description}
      </p>
      <dl>
        <div>
          <dt>Check</dt>
          <dd>
            {forecast.effectiveStat}/{forecast.difficulty}
          </dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd>{forecast.success ? "Pass" : "Fail"}</dd>
        </div>
        <div>
          <dt>Approach</dt>
          <dd>{formatApproach(forecast.approach)}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>
            {forecast.success
              ? `+${xpGain} XP`
              : `-${forecast.healthLossOnFailure} HP, +${xpGain} XP`}
          </dd>
        </div>
      </dl>
      <button
        disabled={busy}
        onClick={() => {
          onChoiceClick();
          onChoose(forecast.skillId);
        }}
        type="button"
      >
        Use {skill.label}
      </button>
    </article>
  );
}

function getChoiceSecondaryStat(
  bundle: RunBundle,
  forecast: ChoiceForecastView,
): StatId | null {
  if (!forecast.bossEncounter || forecast.bossSupportRequired <= 0) {
    return null;
  }

  const supportStat = getSecondHighestEffectiveStat(bundle);
  return supportStat === forecast.stat ? null : supportStat;
}

function hasRequiredStats(
  stats: Record<StatId, number>,
  requirements: Partial<Record<StatId, number>> | undefined,
): boolean {
  if (!requirements) return true;
  return statIds.every((stat) => stats[stat] >= (requirements[stat] ?? 0));
}

function canLearnSkill(
  bundle: RunBundle,
  projectedStats: Record<StatId, number>,
  skillId: SkillId,
): boolean {
  const prerequisite = skillPrerequisites[skillId];
  return (
    bundle.character.skillPoints > 0 &&
    !isSkillUnlocked(bundle.character.unlockedSkillsBits, skillId) &&
    (!prerequisite ||
      isSkillUnlocked(bundle.character.unlockedSkillsBits, prerequisite)) &&
    hasRequiredStats(projectedStats, skillText[skillId].requiredStats)
  );
}

function getStatGrowthDescription(stat: StatId): string {
  switch (stat) {
    case "strength":
      return "Force, endurance, and direct survival.";
    case "intellect":
      return "Reading danger, planning routes, and shaping rewards.";
    case "agility":
      return "Speed, precision, evasion, and clean exits.";
    case "spirit":
      return "Resolve, recovery, fear resistance, and mystic pressure.";
  }
}

function SkillRequirementList({ skillId }: { skillId: SkillId }) {
  const skill = skillText[skillId];
  const prerequisite = skillPrerequisites[skillId];
  const statRequirements = statIds
    .map((stat) => {
      const value = skill.requiredStats?.[stat] ?? 0;
      return value > 0 ? { stat, value } : null;
    })
    .filter((requirement): requirement is { stat: StatId; value: number } =>
      Boolean(requirement),
    );

  if (!prerequisite && statRequirements.length === 0) {
    return <span>Starter</span>;
  }

  return (
    <>
      {prerequisite ? (
        <span className="skill-prerequisite">{skillText[prerequisite].label}</span>
      ) : null}
      {statRequirements.map((requirement) => (
        <StatChip
          key={requirement.stat}
          stat={requirement.stat}
          value={requirement.value}
        />
      ))}
    </>
  );
}

function StatChip({ stat, value }: { stat: StatId; value?: number }) {
  return (
    <span className={`stat-chip stat-tone ${statClass(stat)}`}>
      {statShortLabels[stat]}{value === undefined ? "" : ` ${value}`}
    </span>
  );
}

function GrowthPanel({
  bundle,
  busy,
  pendingAction,
  pendingLabel,
  onAllocateGrowth,
}: {
  bundle: RunBundle;
  busy: boolean;
  pendingAction: PendingAction | null;
  pendingLabel: string | null;
  onAllocateGrowth: (allocation: GrowthAllocation, skillId: SkillId | null) => void;
}) {
  const [allocation, setAllocation] = useState<GrowthAllocation>({
    agility: 0,
    intellect: 0,
    spirit: 0,
    strength: 0,
  });
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);
  const allocatedPoints = statIds.reduce((sum, stat) => sum + allocation[stat], 0);
  const remainingPoints = bundle.character.statPoints - allocatedPoints;
  const nextStep = getPhaseLabel(bundle.run.pendingPhase);
  const classInfo = classText[bundle.character.classId];
  const skills = skillsForClass(bundle.character.classId);
  const projectedStats = statIds.reduce<Record<StatId, number>>(
    (stats, stat) => {
      stats[stat] = bundle.character.baseStats[stat] + allocation[stat];
      return stats;
    },
    {} as Record<StatId, number>,
  );
  const selectedSkillCanUnlock = selectedSkill
    ? canLearnSkill(bundle, projectedStats, selectedSkill)
    : true;
  const canConfirm = remainingPoints === 0 && !busy && selectedSkillCanUnlock;

  function updateAllocation(stat: StatId, delta: number) {
    setAllocation((current) => {
      const nextValue = current[stat] + delta;
      const currentTotal = statIds.reduce((sum, id) => sum + current[id], 0);
      if (nextValue < 0) return current;
      if (delta > 0 && currentTotal >= bundle.character.statPoints) return current;
      return { ...current, [stat]: nextValue };
    });
  }

  return (
    <section aria-label="Character growth" className="stat-allocation-panel">
      {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
      <header className="stat-allocation-header">
        <div>
          <h2>{classInfo.label} Level {bundle.character.xpLevel}</h2>
          <p>
            Assign {bundle.character.statPoints} stat point
            {bundle.character.statPoints === 1 ? "" : "s"}. Skill points can be spent now or saved.
          </p>
        </div>
        <div className="xp-readout">
          <b>{remainingPoints} stat / {bundle.character.skillPoints} skill</b>
          <p>then continue to {nextStep}</p>
        </div>
      </header>

      <div className="stat-allocation-list growth-stat-grid">
        {statIds.map((stat) => (
          <article
            className={`stat-allocation-row stat-growth-row stat-tone ${statClass(stat)}`}
            key={stat}
          >
            <div className="stat-allocation-topline">
              <img
                alt=""
                className="stat-icon"
                height="56"
                src={statIconFor(stat)}
                width="56"
              />
              <h3>{statLabels[stat]}</h3>
            </div>
            <p>{getStatGrowthDescription(stat)}</p>
            <dl>
              <div>
                <dt>Current</dt>
                <dd>{bundle.character.baseStats[stat]}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>+{allocation[stat]}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{projectedStats[stat]}</dd>
              </div>
            </dl>
            <div className="stat-stepper" aria-label={`${statLabels[stat]} allocation`}>
              <button
                disabled={busy || allocation[stat] <= 0}
                onClick={() => updateAllocation(stat, -1)}
                type="button"
              >
                -
              </button>
              <b>{allocation[stat]}</b>
              <button
                disabled={busy || remainingPoints <= 0}
                onClick={() => updateAllocation(stat, 1)}
                type="button"
              >
                +
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="stat-allocation-list skill-growth-list skill-growth-grid">
        {skills.map((skillId) => {
          const skill = skillText[skillId];
          const unlocked = isSkillUnlocked(
            bundle.character.unlockedSkillsBits,
            skillId,
          );
          const prerequisite = skillPrerequisites[skillId];
          const prerequisiteUnlocked =
            !prerequisite ||
            isSkillUnlocked(bundle.character.unlockedSkillsBits, prerequisite);
          const hasStats = hasRequiredStats(projectedStats, skill.requiredStats);
          const canLearn =
            !unlocked &&
            bundle.character.skillPoints > 0 &&
            prerequisiteUnlocked &&
            hasStats;
          const selected = selectedSkill === skillId;
          const pending =
            pendingAction?.kind === "growth" && pendingAction.skillId === skillId;
          const skillStateClass = unlocked
            ? " is-known"
            : !canLearn
              ? " is-locked"
              : selected
                ? " is-selected"
                : " is-available";

          return (
            <article
              className={`stat-allocation-row skill-growth-row stat-tone ${statClass(skill.stat)}${skillStateClass}`}
              key={skillId}
            >
              <div className="stat-allocation-topline">
                <img
                  alt=""
                  className="stat-icon"
                  height="56"
                  src={statIconFor(skill.stat)}
                  width="56"
                />
                <h3>{skill.label}</h3>
              </div>
              <p>{skill.description}</p>
              <dl>
                <div>
                  <dt>Class</dt>
                  <dd>{classInfo.label}</dd>
                </div>
                <div>
                  <dt>Stat</dt>
                  <dd className="stat-chip-list">
                    <StatChip stat={skill.stat} />
                    {skill.bridgeStat ? <StatChip stat={skill.bridgeStat} /> : null}
                  </dd>
                </div>
                <div>
                  <dt>Requires</dt>
                  <dd className="stat-requirement-list">
                    <SkillRequirementList skillId={skillId} />
                  </dd>
                </div>
              </dl>
              <button
                disabled={busy || unlocked || !canLearn}
                onClick={() => setSelectedSkill(selected ? null : skillId)}
                type="button"
              >
                {unlocked
                  ? "Known"
                  : !prerequisiteUnlocked
                    ? "Locked"
                    : !hasStats
                      ? "Needs stats"
                      : bundle.character.skillPoints <= 0
                        ? "No points"
                        : pending
                          ? "Learning..."
                          : selected
                            ? "Selected"
                            : "Pick"}
              </button>
            </article>
          );
        })}
      </div>

      <footer className="stat-allocation-actions">
        <p>
          {selectedSkill
            ? selectedSkillCanUnlock
              ? `${skillText[selectedSkill].label} will be learned with this allocation.`
              : `${skillText[selectedSkill].label} needs different stats.`
            : bundle.character.skillPoints > 0
              ? "No skill selected. Skill points will be saved."
              : "Confirm the stat allocation to continue."}
        </p>
        <button
          disabled={!canConfirm}
          onClick={() => onAllocateGrowth(allocation, selectedSkill)}
          type="button"
        >
          {pendingAction?.kind === "growth" ? "Confirming..." : "Confirm"}
        </button>
      </footer>
    </section>
  );
}

function DropPanel({
  bundle,
  busy,
  currentText,
  latestLog,
  pendingAction,
  pendingLabel,
  onReward,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText>;
  latestLog: ChoiceLogView | null;
  pendingAction: PendingAction | null;
  pendingLabel: string | null;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
}) {
  const current = bundle.currentEncounter!;
  const background = encounterBackgroundFor(current.encounterId);

  return (
    <section aria-label="Encounter drops" className="reward-panel drop-panel">
      <div
        className="reward-art drop-art"
        style={{ backgroundImage: `url(${background})` }}
      >
        <SceneEffectsLayer profile={current.difficultyKind === "boss" ? "boss" : "reward"} />
        {pendingLabel ? <ScenePendingOverlay label={pendingLabel} /> : null}
        <div className="scene-copy reward-copy">
          <h2>{currentText.title}</h2>
          <p>{currentText.description}</p>
        </div>
        {latestLog ? (
          <LatestResultBadge key={choiceLogKey(latestLog)} log={latestLog} />
        ) : null}
        {bundle.rewards.map((reward) => {
          const item = getItemView(bundle, reward.itemId);
          const text = getItemText(reward.itemId);
          const equippedItem = getEquippedItemForSlot(bundle, item.slot);
          const pending =
            pendingAction?.kind === "reward" &&
            pendingAction.rewardIndex === reward.index;

          return (
            <article
              className={[
                "drop-pickup",
                `drop-index-${reward.index}`,
                "stat-tone",
                statClass(getItemPrimaryStat(item)),
              ].join(" ")}
              key={reward.index}
            >
              <ItemIcon itemId={reward.itemId} />
              <div>
                <h3>{text.name}</h3>
                <p>
                  {slotLabels[item.slot]} / Tier {item.tier}
                  <ItemBonusList item={item} />
                </p>
                <RewardComparison
                  equippedItem={equippedItem}
                  offeredItem={item}
                  dominantStat={getDominantEffectiveStat(bundle)}
                />
              </div>
              <div className="drop-actions">
                <button disabled={busy} onClick={() => onReward(reward, false)} type="button">
                  {pending ? "Taking..." : "Pick up"}
                </button>
                <button disabled={busy} onClick={() => onReward(reward, true)} type="button">
                  {pending ? "Equipping..." : "Equip"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CompletePanel({
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

function CharacterPanel({
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
    <section aria-label="Character" className="character-panel">
      <StatsPanel bundle={bundle} />
      <GearPanel
        bundle={bundle}
        busy={busy}
        inventoryIds={inventoryIds}
        pendingAction={pendingAction}
        onEquip={onEquip}
      />
    </section>
  );
}

function StatsPanel({ bundle }: { bundle: RunBundle }) {
  return (
    <section aria-label="Stats" className="stone-panel stats-panel">
      <h2>Status</h2>
      <table>
        <tbody>
          {statIds.map((stat) => {
            const base = bundle.character.baseStats[stat];
            const equipment = getEquipmentStatBonus(bundle, stat);
            const strain = bundle.character.strain[stat];

            return (
              <tr className={`stat-tone ${statClass(stat)}`} key={stat}>
                <th scope="row">{statLabels[stat]}</th>
                <td>
                  <b>{base + equipment}</b>
                </td>
                <td>
                  base {base}
                  {equipment > 0 ? `, equipment +${equipment}` : ""}
                  {strain > 0 ? `, strain ${strain}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function GearPanel({
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
  const equippedIds = new Set(Object.values(bundle.character.equipment));
  const carriedIds = inventoryIds.filter((itemId) => !equippedIds.has(itemId));

  return (
    <section aria-label="Gear" className="stone-panel gear-panel">
      <h2>Gear</h2>
      <div className="gear-section">
        <h3>Equipped</h3>
        <ul>
          {equipmentSlots.map((slot) => {
            const itemId = bundle.character.equipment[slot];
            const item = itemId > 0 ? getItemView(bundle, itemId) : null;
            const text = itemId > 0 ? getItemText(itemId) : null;

            return (
              <GearItemRow
                item={item}
                key={slot}
                slot={slot}
                text={text}
              />
            );
          })}
        </ul>
      </div>

      <div className="gear-section">
        <h3>Pack</h3>
        {carriedIds.length === 0 ? <p>No spare items.</p> : null}
        <ul>
          {carriedIds.map((itemId) => {
          const item = getItemView(bundle, itemId);
          const text = getItemText(itemId);
          const pending =
            pendingAction?.kind === "equip" && pendingAction.itemId === itemId;

          return (
            <GearItemRow
              action={
                <button
                  disabled={busy || bundle.run.status === "lost"}
                  onClick={() => onEquip(itemId)}
                  type="button"
                >
                  {pending ? "Equipping..." : "Equip"}
                </button>
              }
              item={item}
              key={itemId}
              slot={item.slot}
              text={text}
            />
          );
        })}
        </ul>
      </div>
    </section>
  );
}

function GearItemRow({
  action,
  item,
  slot,
  text,
}: {
  action?: ReactNode;
  item: ItemView | null;
  slot: EquipmentSlot;
  text: ReturnType<typeof getItemText> | null;
}) {
  const row = (
    <li tabIndex={text ? 0 : undefined}>
      {item ? <ItemIcon itemId={item.itemId} /> : <div className="empty-icon" />}
      <div className="gear-item-main">
        <strong>{slotLabels[slot]}</strong>
        <p>{text?.name ?? "Empty"}</p>
      </div>
      {item ? <ItemBonusList item={item} /> : null}
      {action ? <div className="gear-action">{action}</div> : null}
    </li>
  );

  if (!text) return row;

  return <DescriptionTooltip content={text.description}>{row}</DescriptionTooltip>;
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

function DescriptionTooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: string;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="game-tooltip"
          collisionPadding={10}
          sideOffset={6}
        >
          {content}
          <Tooltip.Arrow className="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ItemIcon({ itemId }: { itemId: number }) {
  const icon = itemIconFor(itemId);

  if (!icon) return null;

  return <img alt="" className="item-icon" height="32" src={icon} width="32" />;
}

function statIconFor(stat: StatId): string {
  switch (stat) {
    case "strength":
      return "/assets/game/ui/str-icon.png";
    case "intellect":
      return "/assets/game/ui/intellect-icon.png";
    case "agility":
      return "/assets/game/ui/agi-icon.png";
    case "spirit":
      return "/assets/game/ui/spirit-icon.png";
  }
}

function statClass(stat: StatId): string {
  return `stat-${stat}`;
}

function statColorFor(stat: StatId): string {
  switch (stat) {
    case "strength":
      return "#d9553f";
    case "intellect":
      return "#c192ff";
    case "agility":
      return "#70c86f";
    case "spirit":
      return "#e1c661";
  }
}

function getItemPrimaryStat(item: ItemView): StatId {
  return statIds.reduce((primary, stat) =>
    (item.bonuses[stat] ?? 0) > (item.bonuses[primary] ?? 0) ? stat : primary,
  );
}

function ItemBonusList({ item }: { item: ItemView }) {
  const bonuses = statIds
    .map((stat) => ({
      stat,
      value: item.bonuses[stat] ?? 0,
    }))
    .filter((bonus) => bonus.value > 0);

  if (bonuses.length === 0) return null;

  return (
    <b className="bonus-list">
      {" "}
      {bonuses.map((bonus) => (
        <span className={`stat-tone ${statClass(bonus.stat)}`} key={bonus.stat}>
          +{bonus.value} {statShortLabels[bonus.stat]}
        </span>
      ))}
    </b>
  );
}

function RewardComparison({
  dominantStat,
  equippedItem,
  offeredItem,
}: {
  dominantStat: StatId;
  equippedItem: ItemView | null;
  offeredItem: ItemView;
}) {
  const deltas = statIds
    .map((stat) => ({
      stat,
      value:
        (offeredItem.bonuses[stat] ?? 0) -
        (equippedItem?.bonuses[stat] ?? 0),
    }))
    .filter((delta) => delta.value !== 0);
  const dominantDelta =
    (offeredItem.bonuses[dominantStat] ?? 0) -
    (equippedItem?.bonuses[dominantStat] ?? 0);
  const summary = !equippedItem
    ? "Empty slot"
    : dominantDelta > 0
      ? `Build +${dominantDelta}`
      : deltas.some((delta) => delta.value > 0)
        ? "Sidegrade"
        : deltas.length === 0
          ? "Even"
          : "Tradeoff";

  return (
    <p>
      Comparison: {summary}
      {deltas.length > 0
        ? ` (${deltas
            .map(
              (delta) =>
                `${delta.value > 0 ? "+" : ""}${delta.value} ${
                  statShortLabels[delta.stat]
                }`,
            )
            .join(", ")})`
        : ""}
    </p>
  );
}

function getLatestChoiceLog(bundle: RunBundle): ChoiceLogView | null {
  return bundle.recentChoices.reduce<ChoiceLogView | null>(
    (latest, log) => (!latest || log.index > latest.index ? log : latest),
    null,
  );
}

function formatApproach(approach: ChoiceForecastView["approach"]): string {
  switch (approach) {
    case "favored":
      return "Favored";
    case "standard":
      return "Standard";
    case "strained":
      return "Strained";
  }
}

function getPendingActionLabel(action: PendingAction): string {
  switch (action.kind) {
    case "start":
      return "Starting run...";
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

function getRunStepLabel(bundle: RunBundle): string {
  if (bundle.run.phase === "encounter")
    return `${bundle.run.encounterIndex + 1}/3`;
  if (bundle.run.phase === "growth") return "Growth";
  if (bundle.run.phase === "reward") return "Drops";
  return "Complete";
}

function getPhaseLabel(phase: RunBundle["run"]["phase"]): string {
  switch (phase) {
    case "encounter":
      return "the next encounter";
    case "reward":
      return "drops";
    case "growth":
      return "growth";
    case "complete":
      return "the end";
  }
}

function createRunSeed(network: GravenholdNetwork): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  return `${network.profile}-${randomId}`;
}

function formatNetworkBadge(network: GravenholdNetwork): string {
  switch (network.profile) {
    case "dev":
      return "Local";
    case "slot":
      return "Slot";
    case "sepolia":
      return "Testnet";
    case "mainnet":
      return "Mainnet";
  }
}

function getBossEncounterId(level: number): number | null {
  switch (level) {
    case 5:
      return 201;
    case 10:
      return 202;
    case 15:
      return 203;
    case 20:
      return 204;
    default:
      return null;
  }
}

function getEncounterText(id: number) {
  const text = encounterText[id as keyof typeof encounterText];
  if (!text) {
    throw new Error(`Missing encounter text for ${id}.`);
  }
  return text;
}

function getItemText(id: number) {
  const text = itemText[id as keyof typeof itemText];
  if (!text) {
    throw new Error(`Missing item text for ${id}.`);
  }
  return text;
}

function getItemView(bundle: RunBundle, id: number) {
  const item = bundle.items[id];
  if (!item) {
    throw new Error(`Missing onchain item metadata for ${id}.`);
  }
  return item;
}

function getEquippedItemForSlot(
  bundle: RunBundle,
  slot: EquipmentSlot,
): ItemView | null {
  const itemId = bundle.character.equipment[slot];
  return itemId > 0 ? getItemView(bundle, itemId) : null;
}

function getEquipmentStatBonus(bundle: RunBundle, stat: StatId): number {
  return equipmentSlots.reduce((total, slot) => {
    const itemId = bundle.character.equipment[slot];
    if (itemId <= 0) return total;
    return total + (getItemView(bundle, itemId).bonuses[stat] ?? 0);
  }, 0);
}

function getEffectiveStat(bundle: RunBundle, stat: StatId): number {
  return bundle.character.baseStats[stat] + getEquipmentStatBonus(bundle, stat);
}

function getDominantEffectiveStat(bundle: RunBundle): StatId {
  return statIds.reduce((dominant, stat) =>
    getEffectiveStat(bundle, stat) > getEffectiveStat(bundle, dominant)
      ? stat
      : dominant,
  );
}

function getSecondHighestEffectiveStat(bundle: RunBundle): StatId {
  const sorted = [...statIds].sort(
    (first, second) =>
      getEffectiveStat(bundle, second) - getEffectiveStat(bundle, first),
  );
  return sorted[1] ?? sorted[0];
}

function getHealthPercent(bundle: RunBundle): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round((bundle.character.health / bundle.character.maxHealth) * 100),
    ),
  );
}

function getEncounterXp(encounter: CurrentEncounterView): number {
  const boss =
    encounter.source === "boss" || encounter.difficultyKind === "boss";
  return boss ? 10 + encounter.level * 2 : 5 + encounter.level;
}

function getXpRequiredForLevel(xpLevel: number): number {
  return 8 + xpLevel * 3 + Math.floor((xpLevel * xpLevel) / 3);
}

function getXpPercent(bundle: RunBundle): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (bundle.character.xp / getXpRequiredForLevel(bundle.character.xpLevel)) *
          100,
      ),
    ),
  );
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

function errorToast(message: string): ToastMessage {
  return {
    autoDismissMs: 8000,
    message,
  };
}

function stringifyBigInt(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}
