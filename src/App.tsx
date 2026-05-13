import { useCallback, useEffect, useMemo, useState } from "react";

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
  type ChoiceLogView,
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
  agility: "AGI",
  intellect: "DEX",
  spirit: "SPIRIT",
  strength: "STR",
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
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectingSession, setConnectingSession] = useState(false);
  const [bundle, setBundle] = useState<RunBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(connection.error);

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
    void connectSession();
  }, [connectSession, connectingSession, network, session]);

  useEffect(() => {
    if (!network || !session) return;
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
          return;
        }

        const nextBundle = await loadRunBundle(activeNetwork, runId);
        if (!cancelled) {
          setBundle(nextBundle);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(formatError(error));
        }
      }
    }

    void refreshActiveRun();

    return () => {
      cancelled = true;
    };
  }, [network, session]);

  async function runAction(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice(formatError(error));
    } finally {
      setBusy(false);
    }
  }

  function handleStartRun() {
    void runAction(async () => {
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
    void runAction(async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await chooseOption(network, session.signer, bundle.run.id, stat);
      await loadByRunId(network, bundle.run.id);
    });
  }

  function handleReward(reward: RewardOfferView, equipNow: boolean) {
    void runAction(async () => {
      if (!network || !session || !bundle) throw new Error("Run is not ready.");
      await chooseReward(
        network,
        session.signer,
        bundle.run.id,
        reward.index,
        equipNow,
      );
      await loadByRunId(network, bundle.run.id);
    });
  }

  function handleEquip(itemId: number) {
    void runAction(async () => {
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

  return (
    <main className="game-root">
      <div className="game-shell">
        {!bundle ? (
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

        {notice ? <div className="notice-ribbon">{notice}</div> : null}

        {bundle && network && session ? (
          <GameConsole
            bundle={bundle}
            busy={busy}
            currentText={currentText}
            inventoryIds={inventoryIds}
            network={network}
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
    </main>
  );
}

function GameConsole({
  bundle,
  busy,
  currentText,
  inventoryIds,
  network,
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

  return (
    <section aria-label="Gravenhold game console" className="game-console">
      <header className="topbar">
        <strong className="brand">GRAVENHOLD</strong>
        <SceneHud bundle={bundle} />
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

      <div className="main-grid">
        <aside className="equipment-section">
          <h2>Equipped</h2>
          <EquipmentPanel bundle={bundle} />
        </aside>

        <div className="center-column">
          <div className="viewport">
            {showingEncounter ? (
              <EncounterPanel
                bundle={bundle}
                encounterTextRecord={currentText!}
              />
            ) : null}

            {showingReward ? <RewardPanel /> : null}

            {showingComplete ? (
              <CompletePanel
                bundle={bundle}
                busy={busy}
                onRestart={onRestart}
              />
            ) : null}
          </div>

          <div className="command-row">
            {showingEncounter
              ? statIds.map((stat) => (
                  <ChoiceSlotCard
                    busy={busy}
                    bundle={bundle}
                    encounterTextRecord={currentText!}
                    key={stat}
                    stat={stat}
                    onChoose={onChooseStat}
                  />
                ))
              : null}

            {showingReward
              ? bundle.rewards.map((reward) => (
                  <RewardSlotCard
                    busy={busy}
                    bundle={bundle}
                    key={`reward-${reward.index}`}
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
          <StatsPanel bundle={bundle} />
        </section>

        <footer className="inventory-section">
          <h2>Inventory</h2>
          <InventoryPanel
            bundle={bundle}
            busy={busy}
            inventoryIds={inventoryIds}
            onEquip={onEquip}
          />
        </footer>

        <section className="log-section">
          <h2>Log</h2>
          <HistoryPanel logs={bundle.recentChoices} />
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
  stat,
}: {
  bundle: RunBundle;
  busy: boolean;
  encounterTextRecord: ReturnType<typeof getEncounterText>;
  onChoose: (stat: StatId) => void;
  stat: StatId;
}) {
  const option = encounterTextRecord.options[stat];
  const forecast = bundle.forecasts![stat];
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
      className="choice-card"
      disabled={busy}
      onClick={() => onChoose(stat)}
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
  reward,
}: {
  bundle: RunBundle;
  busy: boolean;
  onTake: (reward: RewardOfferView, equipNow: boolean) => void;
  reward: RewardOfferView;
}) {
  const item = getItemView(bundle, reward.itemId);
  const text = getItemText(reward.itemId);

  return (
    <article className="reward-card">
      <p className="reward-label">{text.name}</p>
      <p className="reward-meta">
        {slotLabels[item.slot]} / tier {item.tier}
      </p>
      <ItemIcon itemId={reward.itemId} size="lg" />
      <div className="reward-copy">
        <ItemBonusList item={item} compact />
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

function StatsPanel({ bundle }: { bundle: RunBundle }) {
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
            <div className={`stat-row stat-row-${stat}`} key={stat}>
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

function SceneHud({ bundle }: { bundle: RunBundle }) {
  const healthPercent = getHealthPercent(bundle);
  const metrics = [
    ["LVL", String(bundle.run.level)],
    ["STEP", getRunStepLabel(bundle)],
    ["CHOICES", String(bundle.run.choiceCount)],
  ] as const;

  return (
    <section aria-label="Run status" className="scene-hud">
      {metrics.map(([label, value]) => (
        <div className="scene-hud-chip" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div
        className="health-meter scene-hud-health"
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

function EquipmentPanel({ bundle }: { bundle: RunBundle }) {
  return (
    <section className="equipment-panel" aria-label="Equipped items">
      <div className="equipment-loadout">
        {equipmentSlots.map((slot) => {
          const itemId = bundle.character.equipment[slot];
          const item = itemId > 0 ? getItemView(bundle, itemId) : null;
          const text = itemId > 0 ? getItemText(itemId) : null;

          return (
            <div className="equipment-slot-card" key={slot}>
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
}: {
  bundle: RunBundle;
  busy: boolean;
  inventoryIds: number[];
  onEquip: (itemId: number) => void;
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

          return (
            <button
              aria-label={
                equipped ? `${text.name} is equipped` : `Equip ${text.name}`
              }
              className={`inventory-item ${equipped ? "inventory-item-equipped" : ""}`}
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
}: {
  bundle: RunBundle;
  encounterTextRecord: ReturnType<typeof getEncounterText>;
}) {
  const current = bundle.currentEncounter!;
  const backgroundImage = encounterBackgroundFor(current.encounterId);

  return (
    <section
      className="scene-panel"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(17,13,9,0.12), rgba(17,13,9,0.18) 48%, rgba(17,13,9,0.62)), url(${backgroundImage})`,
      }}
    >
      <div className="encounter-scene-header">
        <div>
          <h2 className="encounter-title">{encounterTextRecord.title}</h2>
          <p className="encounter-subtitle">{current.category}</p>
        </div>
      </div>

      <p className="encounter-description">{encounterTextRecord.description}</p>
    </section>
  );
}

function RewardPanel() {
  return (
    <section className="reward-panel">
      <p className="game-kicker">Reward</p>
      <h2 className="loot-title">{storyText.levelClearedTitle}</h2>
      <p className="loot-copy">{storyText.levelClearedDescription}</p>
    </section>
  );
}

function CompletePanel({
  bundle,
  busy,
  onRestart,
}: {
  bundle: RunBundle;
  busy: boolean;
  onRestart: () => void;
}) {
  const won = bundle.run.status === "won";

  return (
    <section className="complete-panel">
      <p
        className={
          won
            ? "complete-kicker complete-kicker-won"
            : "complete-kicker complete-kicker-lost"
        }
      >
        {won ? "Victory" : "Game Over"}
      </p>
      <h2 className="complete-title">
        {won ? storyText.victoryTitle : storyText.defeatTitle}
      </h2>
      <p className="complete-copy">
        {won ? storyText.victoryDescription : storyText.defeatDescription}
      </p>
      <button
        className="game-button game-button-primary complete-action"
        disabled={busy}
        onClick={onRestart}
        type="button"
      >
        Restart
      </button>
    </section>
  );
}

function HistoryPanel({ logs }: { logs: ChoiceLogView[] }) {
  if (logs.length === 0) return <p className="empty-copy">No actions yet.</p>;

  return (
    <ol className="run-log-list">
      {logs.map((log) => {
        const encounter = getEncounterText(log.encounterId);
        return (
          <li key={`${log.runId}-${log.index}`}>
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

function getEquipmentStatBonus(bundle: RunBundle, stat: StatId): number {
  return equipmentSlots.reduce((total, slot) => {
    const itemId = bundle.character.equipment[slot];
    if (itemId <= 0) return total;
    return total + (getItemView(bundle, itemId).bonuses[stat] ?? 0);
  }, 0);
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
