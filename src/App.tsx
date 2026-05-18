import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createGameSession,
  type GameSession,
} from "@/lib/chain/account/session";
import { itemIconFor } from "@/lib/assets/gameAssets";
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

  return (
    <main>
      {showBootLoader ? <BootLoaderPanel network={network} /> : null}

      {!showBootLoader && !bundle ? (
        <StartPanel
          busy={busy}
          connectingSession={connectingSession}
          network={network}
          seedInput={seedInput}
          showLocalSeed={showLocalSeed}
          onSeedInputChange={setSeedInput}
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
        />
      ) : null}

      {notice ? (
        <PlainNotice message={notice} onDismiss={() => setNotice(null)} />
      ) : null}
    </main>
  );
}

function BootLoaderPanel({ network }: { network: GravenholdNetwork | null }) {
  return (
    <section aria-label="Loading active run">
      <p>{network ? formatNetworkBadge(network) : "Network unavailable"}</p>
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
  onStartRun,
}: {
  busy: boolean;
  connectingSession: boolean;
  network: GravenholdNetwork | null;
  seedInput: string;
  showLocalSeed: boolean;
  onSeedInputChange: (value: string) => void;
  onStartRun: () => void;
}) {
  return (
    <section aria-label="Start run">
      <p>{network ? formatNetworkBadge(network) : "Network unavailable"}</p>
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
    <section aria-label="Notice">
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

  return (
    <section aria-label="Gravenhold game">
      <header>
        <h1>Gravenhold</h1>
        <RunSummary bundle={bundle} />
        <OptionsPanel
          bundle={bundle}
          busy={busy}
          network={network}
          seedInput={seedInput}
          session={session}
          onRestart={onRestart}
          onSeedInputChange={onSeedInputChange}
        />
      </header>

      {pendingLabel ? (
        <section aria-label="Pending action">
          <p>{pendingLabel}</p>
        </section>
      ) : null}

      {latestLog ? <ResultSummary log={latestLog} /> : null}

      <section aria-label="Main game layout">
        <aside>
          <ProgressionList bundle={bundle} />
        </aside>

        <section aria-label="Current state">
          {showingEncounter ? (
            <EncounterPanel
              bundle={bundle}
              busy={busy}
              currentText={currentText!}
              onChooseStat={onChooseStat}
            />
          ) : null}

          {showingReward ? (
            <RewardPanel
              bundle={bundle}
              busy={busy}
              pendingAction={pendingAction}
              onReward={onReward}
            />
          ) : null}

          {showingComplete ? (
            <CompletePanel bundle={bundle} busy={busy} onRestart={onRestart} />
          ) : null}
        </section>

        <aside>
          <CharacterPanel
            bundle={bundle}
            busy={busy}
            inventoryIds={inventoryIds}
            pendingAction={pendingAction}
            onEquip={onEquip}
          />
        </aside>
      </section>

      <HistoryPanel logs={bundle.recentChoices} />
    </section>
  );
}

function RunSummary({ bundle }: { bundle: RunBundle }) {
  return (
    <section aria-label="Run summary">
      <p>
        Level {bundle.run.level} / Step {getRunStepLabel(bundle)} / Choices{" "}
        {bundle.run.choiceCount}
      </p>
      <p>
        Health {bundle.character.health}/{bundle.character.maxHealth}
      </p>
      <p>
        Build: {statLabels[getDominantEffectiveStat(bundle)]} (
        {getRecentChoiceFocus(bundle)})
      </p>
    </section>
  );
}

function OptionsPanel({
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
    <details>
      <summary>Options</summary>
      <p>Network: {network.chainId}</p>
      <p>
        {session.label}: {shortAddress(session.address)}
      </p>

      {network.profile === "dev" || network.accountMode === "local" ? (
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

      <DebugPanel bundle={bundle} />
    </details>
  );
}

function ProgressionList({ bundle }: { bundle: RunBundle }) {
  return (
    <section aria-label="Progression">
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
            <li key={level}>
              <strong>
                Level {level}: {text.title}
              </strong>{" "}
              {bossEncounterId ? "(Boss)" : null} {current ? "(Current)" : null}{" "}
              {completed ? "(Cleared)" : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ResultSummary({ log }: { log: ChoiceLogView }) {
  return (
    <section aria-label="Latest result">
      <h2>Latest Result</h2>
      <p>{getChoiceResultText(log)}</p>
      <ul>
        <li>
          {statLabels[log.stat]} {log.effectiveStat} / Difficulty{" "}
          {log.difficulty}
        </li>
        {log.statGain > 0 ? (
          <li>
            +{log.statGain} {statLabels[log.stat]}
          </li>
        ) : null}
        {log.healthDeltaAmount > 0 ? (
          <li>
            {formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} Health
          </li>
        ) : null}
        {log.completedLevel ? <li>Level clear</li> : null}
        {log.bossDefeated ? <li>Boss defeated</li> : null}
      </ul>
    </section>
  );
}

function EncounterPanel({
  bundle,
  busy,
  currentText,
  onChooseStat,
}: {
  bundle: RunBundle;
  busy: boolean;
  currentText: ReturnType<typeof getEncounterText>;
  onChooseStat: (stat: StatId) => void;
}) {
  const current = bundle.currentEncounter!;

  return (
    <section aria-label="Encounter">
      <h2>{currentText.title}</h2>
      <p>{currentText.description}</p>
      <p>
        {encounterCategoryLabels[current.category]} /{" "}
        {encounterDifficultyLabels[current.difficultyKind]} / Base difficulty{" "}
        {current.baseDifficulty}
      </p>

      <section aria-label="Choices">
        <h3>Choices</h3>
        {statIds.map((stat) => (
          <ChoiceButton
            busy={busy}
            forecast={bundle.forecasts![stat]}
            key={stat}
            stat={stat}
            text={currentText.options[stat]}
            onChoose={onChooseStat}
          />
        ))}
      </section>
    </section>
  );
}

function ChoiceButton({
  busy,
  forecast,
  stat,
  text,
  onChoose,
}: {
  busy: boolean;
  forecast: ChoiceForecastView;
  stat: StatId;
  text: { description: string; label: string };
  onChoose: (stat: StatId) => void;
}) {
  return (
    <article>
      <h4>{text.label}</h4>
      <p>{text.description}</p>
      <p>
        {statLabels[stat]} {forecast.effectiveStat} / Difficulty{" "}
        {forecast.difficulty}
      </p>
      <p>
        Result: {forecast.success ? "Success" : "Failure"} / Approach:{" "}
        {formatApproach(forecast.approach)}
      </p>
      <p>
        {forecast.statGainOnSuccess > 0
          ? `Success growth: +${forecast.statGainOnSuccess} ${statLabels[stat]}`
          : "No success growth"}
        {forecast.success
          ? ""
          : ` / Failure damage: ${forecast.healthLossOnFailure}`}
      </p>
      <button disabled={busy} onClick={() => onChoose(stat)} type="button">
        Choose {statLabels[stat]}
      </button>
    </article>
  );
}

function RewardPanel({
  bundle,
  busy,
  pendingAction,
  onReward,
}: {
  bundle: RunBundle;
  busy: boolean;
  pendingAction: PendingAction | null;
  onReward: (reward: RewardOfferView, equipNow: boolean) => void;
}) {
  return (
    <section aria-label="Rewards">
      <h2>{storyText.levelClearedTitle}</h2>
      <p>{storyText.levelClearedDescription}</p>
      {bundle.rewards.map((reward) => {
        const item = getItemView(bundle, reward.itemId);
        const text = getItemText(reward.itemId);
        const equippedItem = getEquippedItemForSlot(bundle, item.slot);
        const pending =
          pendingAction?.kind === "reward" &&
          pendingAction.rewardIndex === reward.index;

        return (
          <article key={reward.index}>
            <h3>{text.name}</h3>
            <ItemIcon itemId={reward.itemId} />
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
            <button disabled={busy} onClick={() => onReward(reward, false)} type="button">
              {pending ? "Taking..." : "Take"}
            </button>
            <button disabled={busy} onClick={() => onReward(reward, true)} type="button">
              {pending ? "Equipping..." : "Take and equip"}
            </button>
          </article>
        );
      })}
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
    <section aria-label="Complete">
      <h2>{won ? storyText.victoryTitle : storyText.defeatTitle}</h2>
      <p>{won ? storyText.victoryDescription : storyText.defeatDescription}</p>
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
    <section aria-label="Character">
      <StatsPanel bundle={bundle} />
      <EquippedPanel bundle={bundle} />
      <InventoryPanel
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
    <section aria-label="Stats">
      <h2>Status</h2>
      <table>
        <tbody>
          {statIds.map((stat) => {
            const base = bundle.character.baseStats[stat];
            const equipment = getEquipmentStatBonus(bundle, stat);
            const strain = bundle.character.strain[stat];

            return (
              <tr key={stat}>
                <th scope="row">{statLabels[stat]}</th>
                <td>{base + equipment}</td>
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

function EquippedPanel({ bundle }: { bundle: RunBundle }) {
  return (
    <section aria-label="Equipped">
      <h2>Equipped</h2>
      <ul>
        {equipmentSlots.map((slot) => {
          const itemId = bundle.character.equipment[slot];
          const item = itemId > 0 ? getItemView(bundle, itemId) : null;
          const text = itemId > 0 ? getItemText(itemId) : null;

          return (
            <li key={slot}>
              {slotLabels[slot]}: {text?.name ?? "Empty"}
              {item ? (
                <>
                  {" "}
                  <ItemIcon itemId={itemId} />
                  <ItemBonusList item={item} />
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InventoryPanel({
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
    <section aria-label="Inventory">
      <h2>Inventory</h2>
      {inventoryIds.length === 0 ? <p>No items.</p> : null}
      <ul>
        {inventoryIds.map((itemId) => {
          const item = getItemView(bundle, itemId);
          const text = getItemText(itemId);
          const equipped = Object.values(bundle.character.equipment).includes(
            itemId,
          );
          const pending =
            pendingAction?.kind === "equip" && pendingAction.itemId === itemId;

          return (
            <li key={itemId}>
              <ItemIcon itemId={itemId} />
              <strong>{text.name}</strong> {slotLabels[item.slot]} tier{" "}
              {item.tier}. {text.description} <ItemBonusList item={item} />
              <button
                disabled={busy || equipped || bundle.run.status === "lost"}
                onClick={() => onEquip(itemId)}
                type="button"
              >
                {equipped ? "Equipped" : pending ? "Equipping..." : "Equip"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HistoryPanel({ logs }: { logs: ChoiceLogView[] }) {
  return (
    <section aria-label="Log">
      <h2>Log</h2>
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

function ItemIcon({ itemId }: { itemId: number }) {
  const icon = itemIconFor(itemId);

  if (!icon) return null;

  return <img alt="" height="32" src={icon} width="32" />;
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
    <span>
      {" "}
      {bonuses
        .map((bonus) => `+${bonus.value} ${statShortLabels[bonus.stat]}`)
        .join(", ")}
    </span>
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

function getChoiceResultText(log: ChoiceLogView): string {
  if (log.bossDefeated) return "Boss defeated";
  if (log.gameEnded && log.success) return "Victory";
  if (log.gameEnded) return "Defeat";

  const parts = [log.success ? "Success" : "Failure"];
  if (log.statGain > 0) {
    parts.push(`+${log.statGain} ${statLabels[log.stat]}`);
  }
  if (log.healthDeltaAmount > 0) {
    parts.push(`${formatDelta(log.healthDeltaSign, log.healthDeltaAmount)} health`);
  }
  return parts.join(" / ");
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
