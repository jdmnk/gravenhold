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

import { HowItWorksDialog } from "@/components/onboarding/HowItWorksDialog";
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
  chooseOption,
  chooseReward,
  equipItem,
  startRun,
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
  | { kind: "choice"; stat: StatId }
  | { equipNow: boolean; kind: "reward"; rewardIndex: number }
  | { itemId: number; kind: "equip" };

export default function Home() {
  const [seedInput, setSeedInput] = useState(defaultSeed);
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
  const [notice, setNotice] = useState<string | null>(connection.error);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
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
    setNotice(null);

    try {
      const nextSession = await createGameSession(network);
      setSession(nextSession);
      return nextSession;
    } catch (error) {
      setNotice(formatError(error));
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
          setNotice(formatError(error));
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
    setNotice(null);

    try {
      await action();
    } catch (error) {
      setNotice(formatError(error));
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
      await startRun(network, activeSession.signer, seed);
      await loadActive(network, activeSession);
      setNotice("Onchain run started.");
    });
  }

  function handleChooseStat(stat: StatId) {
    void runAction({ kind: "choice", stat }, async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await chooseOption(network, session.signer, bundle.run.id, stat);
      await loadByRunId(network, bundle.run.id);
    });
  }

  function handleReward(reward: RewardOfferView, equipNow: boolean) {
    void runAction(
      { equipNow, kind: "reward", rewardIndex: reward.index },
      async () => {
        if (!network || !session || !bundle)
          throw new Error("Run is not ready.");
        await chooseReward(
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
    if (showBootLoader || bundle || hasSeenHowItWorks) return;
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
    setNotice(null);
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
            showLocalSeed={showLocalSeed}
            onSeedInputChange={setSeedInput}
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
            onChooseStat={handleChooseStat}
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

        {notice ? (
          <PlainNotice message={notice} onDismiss={() => setNotice(null)} />
        ) : null}
      </main>
    </Tooltip.Provider>
  );
}

function BootLoaderPanel({ network }: { network: GravenholdNetwork | null }) {
  return (
    <section aria-label="Loading active run" className="start-screen">
      <p className="network-line">
        {network ? formatNetworkBadge(network) : "Network unavailable"}
      </p>
      <h1>{storyText.title}</h1>
      <p>Checking active run...</p>
    </section>
  );
}

function StartPanel({
  busy,
  connectingSession,
  network,
  seedInput,
  showLocalSeed,
  onSeedInputChange,
  onShowHowItWorks,
  onStartRun,
}: {
  busy: boolean;
  connectingSession: boolean;
  network: GravenholdNetwork | null;
  seedInput: string;
  showLocalSeed: boolean;
  onSeedInputChange: (value: string) => void;
  onShowHowItWorks: () => void;
  onStartRun: () => void;
}) {
  return (
    <section aria-label="Start run" className="start-screen">
      <p className="network-line">
        {network ? formatNetworkBadge(network) : "Network unavailable"}
      </p>
      <h1>{storyText.title}</h1>
      <p>{storyText.subtitle}</p>
      <p>{storyText.intro}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStartRun();
        }}
      >
        {showLocalSeed ? (
          <label>
            Seed{" "}
            <input
              value={seedInput}
              onChange={(event) => onSeedInputChange(event.target.value)}
            />
          </label>
        ) : null}
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

function PlainNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-label="Notice" className="notice-panel">
      <p>{message}</p>
      <button onClick={handleCopy} type="button">
        {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={onDismiss} type="button">
        Dismiss
      </button>
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
  onChooseStat,
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
  onChooseStat: (stat: StatId) => void;
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
        {pendingLabel ? (
          <section aria-label="Pending action" className="pending-panel">
            <p>{pendingLabel}</p>
          </section>
        ) : null}
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
              onChooseStat={onChooseStat}
              onChoiceClick={audio.playChoiceClick}
            />
          ) : null}

          {showingReward ? (
            <RewardPanel
              bundle={bundle}
              busy={busy}
              latestLog={latestLog}
              pendingAction={pendingAction}
              onReward={onReward}
            />
          ) : null}

          {showingComplete ? (
            <CompletePanel
              bundle={bundle}
              busy={busy}
              latestLog={latestLog}
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
  const progressPercent = getRunProgressPercent(bundle);

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
        <b>{statLabels[getDominantEffectiveStat(bundle)]} build</b>
        <p>{getRecentChoiceFocus(bundle)}</p>
        <div className="meter progress-meter" aria-hidden="true">
          <div style={{ width: `${progressPercent}%` }} />
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
        {log.statGain > 0 ? ` / +${log.statGain}` : ""}
        {log.healthDeltaAmount > 0
          ? ` / ${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} HP`
          : ""}
      </p>
    </aside>
  );
}

function EncounterPanel({
  bundle,
  busy,
  currentText,
  latestLog,
  onChoiceClick,
  onChooseStat,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText>;
  latestLog: ChoiceLogView | null;
  onChoiceClick: () => void;
  onChooseStat: (stat: StatId) => void;
}) {
  const current = bundle.currentEncounter!;
  const background = encounterBackgroundFor(current.encounterId);

  return (
    <section aria-label="Encounter" className="encounter-panel">
      <div
        className="encounter-art"
        style={{ backgroundImage: `url(${background})` }}
      >
        {latestLog ? <LatestResultBadge log={latestLog} /> : null}
        <EncounterDetailsPopover
          baseDifficulty={current.baseDifficulty}
          category={encounterCategoryLabels[current.category]}
          difficulty={encounterDifficultyLabels[current.difficultyKind]}
        />
        <div className="encounter-copy">
          <h2>{currentText.title}</h2>
          <p>{currentText.description}</p>
        </div>
      </div>

      <section aria-label="Choices" className="choice-grid">
        <h3>Choices</h3>
        {statIds.map((stat) => (
          <ChoiceButton
            busy={busy}
            forecast={bundle.forecasts![stat]}
            key={stat}
            secondaryStat={getChoiceSecondaryStat(bundle, bundle.forecasts![stat])}
            stat={stat}
            text={currentText.options[stat]}
            onChoiceClick={onChoiceClick}
            onChoose={onChooseStat}
          />
        ))}
      </section>
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
  stat,
  text,
  onChoiceClick,
  onChoose,
}: {
  busy: boolean;
  forecast: ChoiceForecastView;
  secondaryStat: StatId | null;
  stat: StatId;
  text: { description: string; label: string };
  onChoiceClick: () => void;
  onChoose: (stat: StatId) => void;
}) {
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
        <h4>{text.label}</h4>
        <b>{statShortLabels[stat]}</b>
      </div>
      <p className="choice-description">{text.description}</p>
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
            {forecast.success && forecast.statGainOnSuccess > 0
              ? `+${forecast.statGainOnSuccess} ${statShortLabels[stat]}`
              : forecast.success
                ? "Stable"
                : `-${forecast.healthLossOnFailure} HP`}
          </dd>
        </div>
      </dl>
      <button
        disabled={busy}
        onClick={() => {
          onChoiceClick();
          onChoose(stat);
        }}
        type="button"
      >
        Choose {statLabels[stat]}
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

function RewardPanel({
  bundle,
  busy,
  latestLog,
  pendingAction,
  onReward,
}: {
  bundle: RunBundle;
  busy: boolean;
  latestLog: ChoiceLogView | null;
  pendingAction: PendingAction | null;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
}) {
  return (
    <section aria-label="Rewards" className="reward-panel">
      <div
        className="reward-art"
        style={{ backgroundImage: `url(${levelClearedBackground})` }}
      >
        <div className="reward-copy">
          <div>
            <h2>{storyText.levelClearedTitle}</h2>
            <p>{storyText.levelClearedDescription}</p>
          </div>
          {latestLog ? <LatestResultBadge log={latestLog} /> : null}
        </div>
      </div>
      <div className="reward-grid">
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
                "reward-card",
                "stat-tone",
                statClass(getItemPrimaryStat(item)),
              ].join(" ")}
              key={reward.index}
            >
              <ItemIcon itemId={reward.itemId} />
              <h3>{text.name}</h3>
              <p>
                {slotLabels[item.slot]} / Tier {item.tier}
              </p>
              <p>{text.description}</p>
              <ItemBonusList item={item} />
              <RewardComparison
                equippedItem={equippedItem}
                offeredItem={item}
                dominantStat={getDominantEffectiveStat(bundle)}
              />
              <div className="button-row">
                <button disabled={busy} onClick={() => onReward(reward, false)} type="button">
                  {pending ? "Taking..." : "Take"}
                </button>
                <button disabled={busy} onClick={() => onReward(reward, true)} type="button">
                  {pending ? "Equipping..." : "Take and equip"}
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
  onRestart,
}: {
  bundle: RunBundle;
  busy: boolean;
  latestLog: ChoiceLogView | null;
  onRestart: () => void;
}) {
  const won = bundle.run.status === "won";
  const background = won ? levelClearedBackground : gameOverBackground;

  return (
    <section aria-label="Complete" className="complete-panel">
      <div
        className="complete-art"
        style={{ backgroundImage: `url(${background})` }}
      >
        <div className="complete-copy">
          <div>
            <h2>{won ? storyText.victoryTitle : storyText.defeatTitle}</h2>
            <p>
              {won ? storyText.victoryDescription : storyText.defeatDescription}
            </p>
          </div>
          {latestLog ? <LatestResultBadge log={latestLog} /> : null}
        </div>
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
              {log.success ? "success" : "failure"} with {statLabels[log.stat]}{" "}
              ({log.effectiveStat}/{log.difficulty})
              {log.statGain > 0
                ? `, +${log.statGain} ${statShortLabels[log.stat]}`
                : ""}
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
      return "/assets/game/ui/generated/intelect3.png";
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
      return `Resolving ${statLabels[action.stat]}...`;
    case "reward":
      return action.equipNow ? "Equipping reward..." : "Claiming reward...";
    case "equip":
      return "Equipping item...";
  }
}

function getRunStepLabel(bundle: RunBundle): string {
  if (bundle.run.phase === "encounter")
    return `${bundle.run.encounterIndex + 1}/3`;
  if (bundle.run.phase === "reward") return "Reward";
  return "Complete";
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

function getRecentChoiceFocus(bundle: RunBundle): string {
  const counts = Object.fromEntries(
    statIds.map((stat) => [stat, 0]),
  ) as Record<StatId, number>;

  for (const choice of bundle.recentChoices) {
    counts[choice.stat] += 1;
  }

  const dominantStat = statIds.reduce((dominant, stat) =>
    counts[stat] > counts[dominant] ? stat : dominant,
  );
  const total = bundle.recentChoices.length;
  if (total === 0) return "unformed";
  return counts[dominantStat] / total >= 0.6 ? "focused" : "drifting";
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

function getRunProgressPercent(bundle: RunBundle): number {
  const completedSteps =
    (bundle.run.level - 1) * 3 +
    (bundle.run.phase === "reward" || bundle.run.phase === "complete"
      ? 3
      : bundle.run.encounterIndex);
  return Math.max(0, Math.min(100, Math.round((completedSteps / 60) * 100)));
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

function stringifyBigInt(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}
