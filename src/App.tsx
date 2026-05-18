import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createGameSession,
  type GameSession,
} from "@/lib/chain/account/session";
import { encounterBackgroundFor, itemIconFor } from "@/lib/assets/gameAssets";
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
import {
  encounterText,
  itemText,
  storyText,
} from "@/lib/rpgContent/generatedText";

const defaultSeed = "aura-001";
const inventorySlotCount = 12;
const choiceStatIconSrc: Record<StatId, string> = {
  agility: "/assets/game/ui/agi-icon.png",
  intellect: "/assets/game/ui/dex-icon.png",
  spirit: "/assets/game/ui/spirit-icon.png",
  strength: "/assets/game/ui/str-icon.png",
};
const choiceStatNames: Record<StatId, string> = {
  agility: "Agility",
  intellect: "Intellect",
  spirit: "Spirit",
  strength: "Strength",
};
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

type RunVisualEvents = {
  changedEquipmentSlots: ReadonlySet<EquipmentSlot>;
  changedStats: ReadonlySet<StatId>;
  healthChanged: boolean;
  healthLost: boolean;
  latestLogIndex: number | null;
  levelChanged: boolean;
  newInventoryItemIds: ReadonlySet<number>;
  result: {
    details: string[];
    key: string;
    text: string;
    tone: "bad" | "good";
  } | null;
  sceneKey: string;
};

export default function Home() {
  const [seedInput, setSeedInput] = useState(defaultSeed);
  const [connection] = useState<ChainConnection>(() => {
    try {
      const nextNetwork = getNetwork();
      return {
        error: null,
        network: nextNetwork,
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
    )
      return;

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

  return (
    <main className="game-root">
      <div className="game-shell">
        {showBootLoader ? <BootLoaderPanel network={network} /> : null}

        {!showBootLoader && !bundle ? (
          <header className="start-panel">
            <div className="start-copy">
              {network ? (
                <span className="start-network-badge">
                  {formatNetworkBadge(network)}
                </span>
              ) : null}
              <h1 className="game-title">{storyText.title}</h1>
              <p className="start-subtitle">{storyText.subtitle}</p>
              <p className="start-intro">{storyText.intro}</p>
            </div>

            <form
              className="run-start-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleStartRun();
              }}
            >
              {showLocalSeed ? (
                <details className="start-advanced">
                  <summary>Local seed</summary>
                  <label className="seed-field">
                    Seed
                    <input
                      className="game-input"
                      value={seedInput}
                      onChange={(event) => setSeedInput(event.target.value)}
                    />
                  </label>
                </details>
              ) : null}
              <div className="start-actions">
                <button
                  className="game-button game-button-primary"
                  disabled={busy || connectingSession || !network}
                  type="submit"
                >
                  {connectingSession
                    ? "Connecting..."
                    : busy
                      ? "Starting..."
                      : "Start Run"}
                </button>
              </div>
            </form>
          </header>
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
          />
        ) : null}
      </div>

      {notice ? (
        <ToastNotice message={notice} onDismiss={() => setNotice(null)} />
      ) : null}
    </main>
  );
}

function ToastNotice({
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
    <div className="toast-notice" role="status">
      <p>{message}</p>
      <div className="toast-actions">
        <button className="toast-action" onClick={handleCopy} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          aria-label="Dismiss notice"
          className="toast-action toast-action-close"
          onClick={onDismiss}
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function BootLoaderPanel({ network }: { network: GravenholdNetwork | null }) {
  return (
    <section aria-label="Loading active run" className="boot-loader-panel">
      <div className="boot-loader-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="boot-loader-copy">
        {network ? (
          <span className="start-network-badge">
            {formatNetworkBadge(network)}
          </span>
        ) : null}
        <h1 className="boot-loader-title">{storyText.title}</h1>
        <p>Checking active run...</p>
      </div>
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
}) {
  const showingEncounter = Boolean(
    bundle.run.phase === "encounter" &&
    bundle.currentEncounter &&
    currentText &&
    bundle.forecasts,
  );
  const showingReward = bundle.run.phase === "reward";
  const showingComplete = bundle.run.phase === "complete";
  const visualEvents = useRunVisualEvents(bundle);
  const pendingLabel = pendingAction ? getPendingActionLabel(pendingAction) : null;
  const [hoveredStat, setHoveredStat] = useState<StatId | null>(null);
  const previewStat =
    pendingAction?.kind === "choice" ? pendingAction.stat : hoveredStat;
  const sceneEvent = {
    pendingLabel,
    result: visualEvents.result,
  };

  return (
    <section
      aria-label="Gravenhold game console"
      className={`game-console ${busy ? "game-console-busy" : ""}`}
    >
      <header className="topbar">
        <strong className="brand">GRAVENHOLD</strong>
        <SceneHud bundle={bundle} visualEvents={visualEvents} />
        <ShellOptionsPanel
          bundle={bundle}
          busy={busy}
          network={network}
          seedInput={seedInput}
          session={session}
          onRestart={onRestart}
          onSeedInputChange={onSeedInputChange}
        />
      </header>
      <RunProgressStrip bundle={bundle} />

      <div className="main-grid">
        <aside className="equipment-section">
          <h2>Equipped</h2>
          <EquipmentPanel bundle={bundle} visualEvents={visualEvents} />
        </aside>

        <div className="center-column">
          <div
            className={`viewport ${visualEvents.healthLost ? "viewport-damaged" : ""}`}
          >
            {visualEvents.healthLost ? (
              <span
                aria-hidden="true"
                className="viewport-hit-flash"
                key={`hit-${visualEvents.result?.key ?? visualEvents.sceneKey}`}
              />
            ) : null}
            {showingEncounter ? (
              <EncounterPanel
                bundle={bundle}
                encounterTextRecord={currentText!}
                event={sceneEvent}
                key={visualEvents.sceneKey}
                previewStat={previewStat}
              />
            ) : null}

            {showingReward ? (
              <RewardPanel event={sceneEvent} key={visualEvents.sceneKey} />
            ) : null}

            {showingComplete ? (
              <CompletePanel
                bundle={bundle}
                busy={busy}
                event={sceneEvent}
                key={visualEvents.sceneKey}
                onRestart={onRestart}
              />
            ) : null}
          </div>

          <div className={`command-row ${busy ? "command-row-busy" : ""}`}>
            {showingEncounter
              ? statIds.map((stat) => (
                  <ChoiceSlotCard
                    busy={busy}
                    bundle={bundle}
                    encounterTextRecord={currentText!}
                    key={stat}
                    pendingAction={pendingAction}
                    stat={stat}
                    onChoose={onChooseStat}
                    onPreviewStat={setHoveredStat}
                  />
                ))
              : null}

            {showingReward
              ? bundle.rewards.map((reward) => (
                  <RewardSlotCard
                    busy={busy}
                    bundle={bundle}
                    key={`reward-${reward.index}`}
                    pendingAction={pendingAction}
                    reward={reward}
                    onTake={onReward}
                  />
                ))
              : null}

            {showingComplete ? (
              <button
                className="restart-card"
                disabled={busy}
                onClick={onRestart}
                type="button"
              >
                Start another run
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <section className="status-section">
          <h2>Status</h2>
          <StatsPanel bundle={bundle} visualEvents={visualEvents} />
        </section>

        <footer className="inventory-section">
          <h2>Inventory</h2>
          <InventoryPanel
            bundle={bundle}
            busy={busy}
            inventoryIds={inventoryIds}
            pendingAction={pendingAction}
            visualEvents={visualEvents}
            onEquip={onEquip}
          />
        </footer>

        <section className="log-section">
          <h2>Log</h2>
          <HistoryPanel
            latestLogIndex={visualEvents.latestLogIndex}
            logs={bundle.recentChoices}
          />
        </section>
      </div>
    </section>
  );
}

function ChoiceSlotCard({
  bundle,
  busy,
  encounterTextRecord,
  onChoose,
  onPreviewStat,
  pendingAction,
  stat,
}: {
  bundle: RunBundle;
  busy: boolean;
  encounterTextRecord: ReturnType<typeof getEncounterText>;
  onChoose: (stat: StatId) => void;
  onPreviewStat: (stat: StatId | null) => void;
  pendingAction: PendingAction | null;
  stat: StatId;
}) {
  const option = encounterTextRecord.options[stat];
  const forecast = bundle.forecasts![stat];
  const isSelected =
    pendingAction?.kind === "choice" && pendingAction.stat === stat;
  const isMuted = busy && pendingAction?.kind === "choice" && !isSelected;
  const canPreview = !busy;
  const outcomeLines = [
    forecast.statGainOnSuccess > 0
      ? {
          text: `+${forecast.statGainOnSuccess} ${choiceStatNames[stat]}`,
          tone: "good",
        }
      : { text: "NO GROWTH", tone: "muted" },
    !forecast.success
      ? { text: `-${forecast.healthLossOnFailure} HP`, tone: "bad" }
      : null,
    forecast.approach === "strained" || forecast.strainDifficultyAmount > 0
      ? { text: "STRAINED", tone: "risk" }
      : null,
    forecast.bossSupportDifficultyAmount > 0
      ? {
          text: `SUPPORT ${forecast.bossSupportValue}/${forecast.bossSupportRequired}`,
          tone: "risk",
        }
      : null,
    forecast.opensRewardOnSuccess ? { text: "REWARD", tone: "good" } : null,
    forecast.winsOnSuccess ? { text: "VICTORY", tone: "good" } : null,
  ].filter((line): line is { text: string; tone: string } => Boolean(line));

  return (
    <button
      className={[
        "choice-card",
        `choice-card-${stat}`,
        isSelected ? "choice-card-selected" : "",
        isMuted ? "choice-card-muted" : "",
        canPreview ? "choice-card-previewable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={busy}
      onBlur={() => onPreviewStat(null)}
      onClick={() => onChoose(stat)}
      onFocus={() => onPreviewStat(stat)}
      onMouseEnter={() => onPreviewStat(stat)}
      onMouseLeave={() => onPreviewStat(null)}
      type="button"
    >
      <p className="choice-label">{option.label}</p>
      <img
        alt=""
        className="choice-stat-icon"
        src={choiceStatIconSrc[stat]}
      />
      <p className={`choice-stat choice-stat-${stat}`}>
        {choiceStatNames[stat]}
      </p>
      <p className="choice-description">{option.description}</p>
      <div className="choice-outcomes">
        {outcomeLines.map((line) => (
          <span
            className={`choice-outcome choice-outcome-${line.tone}`}
            key={line.text}
          >
            {line.text}
          </span>
        ))}
      </div>
    </button>
  );
}

function RewardSlotCard({
  bundle,
  busy,
  onTake,
  pendingAction,
  reward,
}: {
  bundle: RunBundle;
  busy: boolean;
  onTake: (reward: RewardOfferView, equipNow: boolean) => void;
  pendingAction: PendingAction | null;
  reward: RewardOfferView;
}) {
  const item = getItemView(bundle, reward.itemId);
  const text = getItemText(reward.itemId);
  const equippedItem = getEquippedItemForSlot(bundle, item.slot);
  const dominantStat = getDominantEffectiveStat(bundle);
  const isSelected =
    pendingAction?.kind === "reward" && pendingAction.rewardIndex === reward.index;

  return (
    <article
      className={`reward-card ${isSelected ? "reward-card-selected" : ""}`}
    >
      <p className="reward-label">{text.name}</p>
      <p className="reward-meta">
        {slotLabels[item.slot]} / tier {item.tier}
      </p>
      <ItemIcon itemId={reward.itemId} size="lg" />
      <div className="reward-copy">
        <ItemBonusList item={item} compact />
        <RewardComparison
          dominantStat={dominantStat}
          equippedItem={equippedItem}
          offeredItem={item}
        />
      </div>
      <div className="reward-actions">
        <button
          className="game-button game-button-small game-button-secondary"
          disabled={busy}
          onClick={() => onTake(reward, false)}
          type="button"
        >
          Take
        </button>
        <button
          className="game-button game-button-small game-button-primary"
          disabled={busy}
          onClick={() => onTake(reward, true)}
          type="button"
        >
          Equip
        </button>
      </div>
    </article>
  );
}

function ShellOptionsPanel({
  bundle,
  busy,
  network,
  seedInput,
  session,
  onRestart,
  onSeedInputChange,
}: {
  bundle: RunBundle;
  busy: boolean;
  network: GravenholdNetwork;
  seedInput: string;
  session: GameSession;
  onRestart: () => void;
  onSeedInputChange: (value: string) => void;
}) {
  return (
    <details className="options-panel">
      <summary aria-label="Open options">
        <span className="sr-only">Options</span>
      </summary>
      <div className="options-popover">
        <div className="chain-status-grid">
          <Metric label="Network" value={network.chainId} />
          <Metric label={session.label} value={shortAddress(session.address)} />
        </div>

        {network.profile === "dev" || network.accountMode === "local" ? (
          <form
            className="seed-form"
            onSubmit={(event) => {
              event.preventDefault();
              onRestart();
            }}
          >
            <label className="seed-field">
              Seed
              <input
                className="game-input"
                value={seedInput}
                onChange={(event) => onSeedInputChange(event.target.value)}
              />
            </label>
            <button
              className="game-button game-button-primary"
              disabled={busy}
              type="submit"
            >
              New Run
            </button>
          </form>
        ) : null}

        <DebugPanel bundle={bundle} />
      </div>
    </details>
  );
}

function StatsPanel({
  bundle,
  visualEvents,
}: {
  bundle: RunBundle;
  visualEvents: RunVisualEvents;
}) {
  return (
    <section aria-label="Character stats" className="stats-panel">
      <div className="stat-grid">
        {statIds.map((stat) => {
          const characterStat = bundle.character.baseStats[stat];
          const equipmentBonus = getEquipmentStatBonus(bundle, stat);
          const strain = bundle.character.strain[stat];
          const value = characterStat + equipmentBonus;
          const details = [
            equipmentBonus > 0 ? `+${equipmentBonus} eq` : null,
            strain > 0 ? `${strain} strain` : null,
          ].filter(Boolean);

          return (
            <div
              className={[
                "stat-row",
                `stat-row-${stat}`,
                visualEvents.changedStats.has(stat) ? "stat-row-changed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={stat}
            >
              <span className="stat-copy">
                <strong>{statLabels[stat]}</strong>
                {details.length > 0 ? <span>{details.join(" / ")}</span> : null}
              </span>
              <span className="stat-value">{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SceneHud({
  bundle,
  visualEvents,
}: {
  bundle: RunBundle;
  visualEvents: RunVisualEvents;
}) {
  const healthPercent = getHealthPercent(bundle);
  const metrics = [
    ["LVL", String(bundle.run.level)],
    ["STEP", getRunStepLabel(bundle)],
    ["CHOICES", String(bundle.run.choiceCount)],
  ] as const;

  return (
    <section aria-label="Run status" className="scene-hud">
      {metrics.map(([label, value]) => (
        <div
          className={[
            "scene-hud-chip",
            label === "LVL" && visualEvents.levelChanged
              ? "scene-hud-chip-changed"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={label}
        >
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <BuildIdentityChip bundle={bundle} />
      <div
        className={[
          "health-meter",
          "scene-hud-health",
          visualEvents.healthChanged ? "scene-hud-health-changed" : "",
          visualEvents.healthLost ? "scene-hud-health-lost" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Health ${bundle.character.health} of ${bundle.character.maxHealth}`}
      >
        <div className="health-meter-label">
          <span>Health</span>
          <strong>
            {bundle.character.health}/{bundle.character.maxHealth}
          </strong>
        </div>
        <div className="health-track">
          <div className="health-fill" style={{ width: `${healthPercent}%` }} />
        </div>
      </div>
    </section>
  );
}

function RunProgressStrip({ bundle }: { bundle: RunBundle }) {
  const maxLevel = 20;
  const bossLevels = new Set([5, 10, 15, 20]);

  return (
    <nav className="run-progress-strip" aria-label="Run progress">
      {Array.from({ length: maxLevel }, (_, index) => {
        const level = index + 1;
        const completed =
          bundle.run.status === "won" || level < bundle.run.level;
        const active =
          level === bundle.run.level &&
          bundle.run.status !== "won" &&
          bundle.run.status !== "lost";
        const boss = bossLevels.has(level);

        return (
          <span
            aria-label={`Level ${level}${boss ? " boss" : ""}${active ? " current" : completed ? " cleared" : ""}`}
            className={[
              "run-progress-node",
              completed ? "run-progress-node-complete" : "",
              active ? "run-progress-node-active" : "",
              boss ? "run-progress-node-boss" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={level}
          >
            {level}
          </span>
        );
      })}
    </nav>
  );
}

function BuildIdentityChip({ bundle }: { bundle: RunBundle }) {
  const dominantStat = getDominantEffectiveStat(bundle);
  const recentFocus = getRecentChoiceFocus(bundle);
  const focusLabel =
    recentFocus.total === 0
      ? "unformed"
      : recentFocus.ratio >= 0.6
        ? "focused"
        : "drifting";

  return (
    <div className={`scene-hud-chip build-chip build-chip-${dominantStat}`}>
      <span>Build</span>
      <strong>{choiceStatNames[dominantStat]}</strong>
      <em>{focusLabel}</em>
    </div>
  );
}

function EquipmentPanel({
  bundle,
  visualEvents,
}: {
  bundle: RunBundle;
  visualEvents: RunVisualEvents;
}) {
  return (
    <section className="equipment-panel" aria-label="Equipped items">
      <div className="equipment-loadout">
        {equipmentSlots.map((slot) => {
          const itemId = bundle.character.equipment[slot];
          const item = itemId > 0 ? getItemView(bundle, itemId) : null;
          const text = itemId > 0 ? getItemText(itemId) : null;

          return (
            <div
              className={[
                "equipment-slot-card",
                item ? "equipment-slot-card-filled" : "",
                visualEvents.changedEquipmentSlots.has(slot)
                  ? "equipment-slot-card-changed"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={slot}
            >
              <ItemIcon itemId={itemId} size="lg" />
              <div className="equipment-slot-copy">
                <strong>{text?.name ?? "Empty"}</strong>
                <p className="equipment-slot-meta">
                  {item
                    ? `${slotLabels[item.slot]} / tier ${item.tier}`
                    : slotLabels[slot]}
                </p>
                {item ? <ItemBonusList item={item} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InventoryPanel({
  bundle,
  busy,
  inventoryIds,
  onEquip,
  pendingAction,
  visualEvents,
}: {
  bundle: RunBundle;
  busy: boolean;
  inventoryIds: number[];
  onEquip: (itemId: number) => void;
  pendingAction: PendingAction | null;
  visualEvents: RunVisualEvents;
}) {
  const slots = Array.from(
    { length: inventorySlotCount },
    (_, index) => inventoryIds[index] ?? null,
  );

  return (
    <section aria-label="Inventory" className="inventory-panel">
      <div className="inventory-grid">
        {slots.map((itemId, index) => {
          if (!itemId) {
            return (
              <div
                aria-hidden="true"
                className="inventory-empty"
                key={`empty-${index}`}
              />
            );
          }

          const item = getItemView(bundle, itemId);
          const text = getItemText(itemId);
          const equipped = Object.values(bundle.character.equipment).includes(
            itemId,
          );
          const isPendingEquip =
            pendingAction?.kind === "equip" && pendingAction.itemId === itemId;

          return (
            <button
              aria-label={
                equipped ? `${text.name} is equipped` : `Equip ${text.name}`
              }
              className={[
                "inventory-item",
                equipped ? "inventory-item-equipped" : "",
                isPendingEquip ? "inventory-item-pending" : "",
                visualEvents.newInventoryItemIds.has(itemId)
                  ? "inventory-item-new"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={busy || equipped || bundle.run.status === "lost"}
              key={itemId}
              onClick={() => onEquip(itemId)}
              title={`${text.name} - ${slotLabels[item.slot]} tier ${item.tier}`}
              type="button"
            >
              <ItemIcon itemId={itemId} size="md" />
              <span className="item-tooltip">
                <strong>{text.name}</strong>
                <span>
                  {slotLabels[item.slot]} / tier {item.tier}
                </span>
                <ItemBonusList item={item} compact />
                <em>{equipped ? "Equipped" : "Click to equip"}</em>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EncounterPanel({
  bundle,
  encounterTextRecord,
  event,
  previewStat,
}: {
  bundle: RunBundle;
  encounterTextRecord: ReturnType<typeof getEncounterText>;
  event: SceneEvent;
  previewStat: StatId | null;
}) {
  const current = bundle.currentEncounter!;
  const backgroundImage = encounterBackgroundFor(current.encounterId);
  const previewForecast =
    previewStat && bundle.forecasts ? bundle.forecasts[previewStat] : null;
  const previewOption = previewStat
    ? encounterTextRecord.options[previewStat]
    : null;
  const tactical =
    previewStat && previewForecast && previewOption ? (
      <ChoicePreviewOverlay
        forecast={previewForecast}
        optionLabel={previewOption.label}
        stat={previewStat}
      />
    ) : null;

  return (
    <SceneStage
      body={encounterTextRecord.description}
      className={[
        "scene-panel",
        previewStat ? `scene-panel-preview scene-panel-preview-${previewStat}` : "",
        current.difficultyKind === "boss" || current.source === "boss"
          ? "scene-panel-boss"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(17,13,9,0.12), rgba(17,13,9,0.18) 48%, rgba(17,13,9,0.62)), url(${backgroundImage})`,
      }}
      event={event}
      meta={<EncounterDossier bundle={bundle} />}
      subtitle={`${current.category} / ${current.difficultyKind}`}
      subtitleClassName="encounter-subtitle"
      tactical={tactical}
      title={encounterTextRecord.title}
      titleClassName="encounter-title"
    />
  );
}

type SceneEvent = {
  pendingLabel: string | null;
  result: RunVisualEvents["result"];
};

function SceneStage({
  body,
  children,
  className,
  event,
  meta,
  style,
  subtitle,
  subtitleClassName,
  tactical,
  title,
  titleClassName,
}: {
  body?: string;
  children?: ReactNode;
  className: string;
  event: SceneEvent;
  meta?: ReactNode;
  style?: CSSProperties;
  subtitle?: string;
  subtitleClassName?: string;
  tactical?: ReactNode;
  title: string;
  titleClassName?: string;
}) {
  return (
    <section className={className} style={style}>
      <div className="scene-stage">
        <header className="scene-stage-header">
          <h2 className={titleClassName}>{title}</h2>
          {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
        </header>

        <SceneEventDock event={event} />

        {meta ? <div className="scene-stage-meta">{meta}</div> : null}

        <div className="scene-stage-tactical">{tactical}</div>

        {body ? <p className="scene-stage-description">{body}</p> : null}
        {children}
      </div>
    </section>
  );
}

function EncounterDossier({ bundle }: { bundle: RunBundle }) {
  const current = bundle.currentEncounter!;
  const forecasts = bundle.forecasts;
  const firstForecast = forecasts ? forecasts[statIds[0]] : null;
  const bossForecast = forecasts
    ? statIds.map((stat) => forecasts[stat]).find((forecast) => forecast.bossEncounter)
    : null;
  const bossSupport =
    bossForecast && bossForecast.bossSupportRequired > 0
      ? `${bossForecast.bossSupportValue}/${bossForecast.bossSupportRequired}`
      : null;
  type DossierProp = {
    label: string;
    priority?: "primary";
    tone?: string;
    value: string;
  };
  const props: DossierProp[] = [
    {
      label: "Type",
      priority: "primary",
      tone: `category-${current.category}`,
      value: encounterCategoryLabels[current.category],
    },
    {
      label: "Difficulty",
      priority: "primary",
      tone: `difficulty-${current.difficultyKind}`,
      value: encounterDifficultyLabels[current.difficultyKind],
    },
    {
      label: "Base Difficulty",
      value: String(firstForecast?.baseDifficulty ?? current.baseDifficulty),
    },
  ];

  if (bossSupport && bossForecast) {
    props.push({
      label: "Support",
      tone:
        bossForecast.bossSupportValue >= bossForecast.bossSupportRequired
          ? "support-ready"
          : "support-risk",
      value: bossSupport,
    });

    if (bossForecast.bossSupportDifficultyAmount > 0) {
      props.push({
        label: "Boss Difficulty",
        tone: "support-risk",
        value: `+${bossForecast.bossSupportDifficultyAmount}`,
      });
    }

    if (bossForecast.bossSupportDamageAmount > 0) {
      props.push({
        label: "Boss Damage",
        tone: "support-risk",
        value: `+${bossForecast.bossSupportDamageAmount}`,
      });
    }
  }

  return (
    <dl className="encounter-dossier" aria-label="Encounter details">
      {props.map((prop) => (
        <div
          className={[
            "encounter-dossier-prop",
            prop.priority ? `encounter-dossier-prop-${prop.priority}` : "",
            prop.tone ? `encounter-dossier-${prop.tone}` : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={prop.label}
        >
          <dt>{prop.label}</dt>
          <dd>{prop.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SceneEventDock({ event }: { event: SceneEvent }) {
  return (
    <div className="scene-event-dock">
      {event.result ? (
        <div
          className={`result-burst result-burst-${event.result.tone}`}
          key={event.result.key}
        >
          <strong>{event.result.text}</strong>
          <span className="result-breakdown">
            {event.result.details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </span>
        </div>
      ) : null}
      {event.pendingLabel ? (
        <div className="result-burst result-burst-pending" role="status">
          {event.pendingLabel}
        </div>
      ) : null}
    </div>
  );
}

function ChoicePreviewOverlay({
  forecast,
  optionLabel,
  stat,
}: {
  forecast: ChoiceForecastView;
  optionLabel: string;
  stat: StatId;
}) {
  const margin = forecast.effectiveStat - forecast.difficulty;
  const outcome = forecast.success ? "Likely success" : "Failure risk";
  const marginText =
    margin > 0
      ? `Pass by ${margin}`
      : margin === 0
        ? "Pass exactly"
        : `Short by ${Math.abs(margin)}`;
  const payoff =
    forecast.winsOnSuccess
      ? "Victory"
      : forecast.opensRewardOnSuccess
        ? "Reward opens"
        : forecast.statGainOnSuccess > 0
          ? `+${forecast.statGainOnSuccess} ${choiceStatNames[stat]}`
          : "No growth";
  const danger = forecast.success
    ? forecast.approach === "strained"
      ? "Strained"
      : forecast.approach
    : forecast.wouldLoseOnFailure
      ? "Defeat if failed"
      : `-${forecast.healthLossOnFailure} HP`;

  return (
    <aside
      aria-label={`${choiceStatNames[stat]} option preview`}
      className={`choice-preview-overlay choice-preview-overlay-${stat}`}
    >
      <div className="choice-preview-heading">
        <span>{choiceStatNames[stat]}</span>
        <strong>{optionLabel}</strong>
      </div>
      <div className="choice-preview-math">
        <div>
          <span>Your {choiceStatNames[stat]}</span>
          <strong>{forecast.effectiveStat}</strong>
        </div>
        <div>
          <span>Needed Difficulty</span>
          <strong>{forecast.difficulty}</strong>
        </div>
        <div>
          <span>Result</span>
          <strong
            className={
              margin >= 0
                ? "choice-preview-margin-good"
                : "choice-preview-margin-bad"
            }
          >
            {marginText}
          </strong>
        </div>
      </div>
      <div className="choice-preview-lines">
        <span
          className={
            forecast.success
              ? "choice-preview-line-good"
              : "choice-preview-line-bad"
          }
        >
          {outcome}
        </span>
        <span className="choice-preview-line-muted">
          Approach: {formatApproach(forecast.approach)}
        </span>
        <span className="choice-preview-line-good">{payoff}</span>
        <span
          className={
            forecast.success && forecast.approach !== "strained"
              ? "choice-preview-line-muted"
              : "choice-preview-line-risk"
          }
        >
          {danger}
        </span>
      </div>
    </aside>
  );
}

function RewardPanel({ event }: { event: SceneEvent }) {
  return (
    <SceneStage
      body={storyText.levelClearedDescription}
      className="reward-panel"
      event={event}
      subtitle="Reward"
      subtitleClassName="game-kicker"
      title={storyText.levelClearedTitle}
      titleClassName="loot-title"
    />
  );
}

function CompletePanel({
  bundle,
  busy,
  event,
  onRestart,
}: {
  bundle: RunBundle;
  busy: boolean;
  event: SceneEvent;
  onRestart: () => void;
}) {
  const won = bundle.run.status === "won";

  return (
    <SceneStage
      body={won ? storyText.victoryDescription : storyText.defeatDescription}
      className="complete-panel"
      event={event}
      subtitle={won ? "Victory" : "Game Over"}
      subtitleClassName={
        won
          ? "complete-kicker complete-kicker-won"
          : "complete-kicker complete-kicker-lost"
      }
      title={won ? storyText.victoryTitle : storyText.defeatTitle}
      titleClassName="complete-title"
    >
      <button
        className="game-button game-button-primary complete-action"
        disabled={busy}
        onClick={onRestart}
        type="button"
      >
        Restart
      </button>
    </SceneStage>
  );
}

function HistoryPanel({
  latestLogIndex,
  logs,
}: {
  latestLogIndex: number | null;
  logs: ChoiceLogView[];
}) {
  if (logs.length === 0) return <p className="empty-copy">No actions yet.</p>;

  return (
    <ol className="run-log-list">
      {logs.map((log) => {
        const encounter = getEncounterText(log.encounterId);
        return (
          <li
            className={log.index === latestLogIndex ? "run-log-entry-new" : ""}
            key={`${log.runId}-${log.index}`}
          >
            <span>L{log.level}</span>
            {encounter.title}: {log.success ? "success" : "failure"} with{" "}
            {statLabels[log.stat]} ({log.effectiveStat}/{log.difficulty})
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
  );
}

function useRunVisualEvents(bundle: RunBundle): RunVisualEvents {
  const previousRef = useRef<RunBundle | null>(null);
  const events = useMemo(
    () => createRunVisualEvents(previousRef.current, bundle),
    [bundle],
  );

  useEffect(() => {
    previousRef.current = bundle;
  }, [bundle]);

  return events;
}

function createRunVisualEvents(
  previous: RunBundle | null,
  current: RunBundle,
): RunVisualEvents {
  const sceneKey = getSceneKey(current);
  const emptyEvents: RunVisualEvents = {
    changedEquipmentSlots: new Set(),
    changedStats: new Set(),
    healthChanged: false,
    healthLost: false,
    latestLogIndex: null,
    levelChanged: false,
    newInventoryItemIds: new Set(),
    result: null,
    sceneKey,
  };

  if (!previous || previous.run.id !== current.run.id) {
    return emptyEvents;
  }

  const changedStats = new Set<StatId>();
  statIds.forEach((stat) => {
    if (
      previous.character.baseStats[stat] !== current.character.baseStats[stat] ||
      previous.character.strain[stat] !== current.character.strain[stat] ||
      getEffectiveStat(previous, stat) !== getEffectiveStat(current, stat)
    ) {
      changedStats.add(stat);
    }
  });

  const changedEquipmentSlots = new Set<EquipmentSlot>();
  equipmentSlots.forEach((slot) => {
    if (previous.character.equipment[slot] !== current.character.equipment[slot]) {
      changedEquipmentSlots.add(slot);
    }
  });

  const previousInventory = new Set(
    inventoryItemIds(previous.character.inventoryBits),
  );
  const newInventoryItemIds = new Set(
    inventoryItemIds(current.character.inventoryBits).filter(
      (itemId) => !previousInventory.has(itemId),
    ),
  );

  const latestLogIndex = getLatestNewLogIndex(previous, current);
  const latestLog =
    latestLogIndex === null
      ? null
      : current.recentChoices.find((log) => log.index === latestLogIndex) ?? null;

  return {
    changedEquipmentSlots,
    changedStats,
    healthChanged: previous.character.health !== current.character.health,
    healthLost: current.character.health < previous.character.health,
    latestLogIndex,
    levelChanged: previous.run.level !== current.run.level,
    newInventoryItemIds,
    result: latestLog
      ? {
          details: getChoiceResultDetails(latestLog),
          key: `${current.run.id}-${latestLog.index}-${current.character.health}`,
          text: getChoiceResultText(latestLog),
          tone: latestLog.success ? "good" : "bad",
        }
      : null,
    sceneKey,
  };
}

function getSceneKey(bundle: RunBundle): string {
  const encounterId = bundle.currentEncounter?.encounterId ?? "none";
  return [
    bundle.run.id.toString(),
    bundle.run.phase,
    bundle.run.status,
    bundle.run.level,
    bundle.run.encounterIndex,
    encounterId,
    bundle.run.rewardCount,
  ].join("-");
}

function getLatestNewLogIndex(
  previous: RunBundle,
  current: RunBundle,
): number | null {
  const previousLatest = Math.max(
    -1,
    ...previous.recentChoices.map((log) => log.index),
  );
  const currentLatest = Math.max(
    -1,
    ...current.recentChoices.map((log) => log.index),
  );
  return currentLatest > previousLatest ? currentLatest : null;
}

function getChoiceResultText(log: ChoiceLogView): string {
  if (log.bossDefeated) return "BOSS DEFEATED";
  if (log.gameEnded && log.success) return "VICTORY";
  if (log.gameEnded) return "DEFEAT";

  const parts = [log.success ? "SUCCESS" : "FAILURE"];
  if (log.statGain > 0) {
    parts.push(`+${log.statGain} ${choiceStatNames[log.stat]}`);
  }
  if (log.healthDeltaAmount > 0) {
    parts.push(`${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} Health`);
  }
  return parts.join(" / ");
}

function getChoiceResultDetails(log: ChoiceLogView): string[] {
  const details = [
    `${choiceStatNames[log.stat]} ${log.effectiveStat} / Difficulty ${log.difficulty}`,
  ];

  if (log.statGain > 0) {
    details.push(`+${log.statGain} ${choiceStatNames[log.stat]}`);
  }
  if (log.healthDeltaAmount > 0) {
    details.push(`${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} Health`);
  }
  if (log.completedLevel) {
    details.push(log.gameEnded ? "Run complete" : "Level clear");
  }
  if (log.bossDefeated) {
    details.push("Gate fallen");
  }

  return details;
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
      return `Resolving ${choiceStatNames[action.stat]}...`;
    case "reward":
      return action.equipNow ? "Equipping reward..." : "Claiming reward...";
    case "equip":
      return "Equipping item...";
  }
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
    <details className="debug-panel">
      <summary>Chain Debug</summary>
      <pre>{JSON.stringify(snapshot, stringifyBigInt, 2)}</pre>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function ItemIcon({ itemId, size }: { itemId: number; size: "lg" | "md" }) {
  const icon = itemId > 0 ? itemIconFor(itemId) : null;
  const sizeClass = size === "lg" ? "item-icon-lg" : "item-icon-md";

  return (
    <span className={`item-icon ${sizeClass}`} aria-hidden="true">
      {icon ? (
        <img className="item-icon-image" src={icon} alt="" />
      ) : itemId > 0 ? (
        <span className="item-icon-fallback">#{itemId}</span>
      ) : null}
    </span>
  );
}

function ItemBonusList({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: ItemView;
}) {
  const bonuses = statIds
    .map((stat) => ({
      stat,
      value: item.bonuses[stat] ?? 0,
    }))
    .filter((bonus) => bonus.value > 0);

  if (bonuses.length === 0) return null;

  return (
    <div
      className={`item-bonus-list ${compact ? "item-bonus-list-compact" : ""}`}
    >
      {bonuses.map((bonus) => (
        <span className={`item-bonus item-bonus-${bonus.stat}`} key={bonus.stat}>
          +{bonus.value} {statShortLabels[bonus.stat]}
        </span>
      ))}
    </div>
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
    <div className="reward-comparison" aria-label="Reward comparison">
      <span className="reward-comparison-summary">{summary}</span>
      {deltas.length > 0 ? (
        <div className="reward-delta-list">
          {deltas.map((delta) => (
            <span
              className={[
                "reward-delta",
                delta.value > 0 ? "reward-delta-good" : "reward-delta-bad",
              ].join(" ")}
              key={delta.stat}
            >
              {delta.value > 0 ? "+" : ""}
              {delta.value} {statShortLabels[delta.stat]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
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

function getRecentChoiceFocus(bundle: RunBundle): {
  dominantStat: StatId;
  ratio: number;
  total: number;
} {
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
  return {
    dominantStat,
    ratio: total === 0 ? 0 : counts[dominantStat] / total,
    total,
  };
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
