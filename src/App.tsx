import * as Tooltip from "@radix-ui/react-tooltip";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameConsole } from "@/components/game/GameShell";
import { BootLoaderPanel, StartPanel } from "@/components/game/StartScreen";
import { HowItWorksDialog } from "@/components/onboarding/HowItWorksDialog";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import {
  createGameSession,
  type GameSession,
} from "@/lib/chain/account/session";
import { getNetwork, type GravenholdNetwork } from "@/lib/chain/networkConfig";
import {
  allocateGrowth,
  chooseSkill,
  claimDrop,
  equipItem,
  startRun,
  type GrowthAllocation,
} from "@/lib/chain/systems";
import { inventoryItemIds, type RewardOfferView, type RunBundle } from "@/lib/chain/state";
import { getActiveRunId, loadRunBundle } from "@/lib/chain/views";
import { type PendingAction } from "@/lib/game/pendingAction";
import { getEncounterText } from "@/lib/game/runDisplay";
import {
  hasSeenHowItWorksIntro,
  markHowItWorksIntroSeen,
} from "@/lib/onboarding/onboardingState";
import { type ClassId, type SkillId } from "@/lib/rpgContent/classes";

import "./App.css";

const defaultSeed = "aura-001";

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
  const walletMode = Boolean(network && network.accountMode !== "local");
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

  function handleResumeRun() {
    void runAction({ kind: "resume" }, async () => {
      if (!network) throw new Error("Chain account is not ready.");
      const activeSession = session ?? (await connectSession());
      if (!activeSession) throw new Error("Chain account is not ready.");
      const runId = await getActiveRunId(network, activeSession.address);
      if (runId === BigInt(0)) {
        throw new Error("No active run found for this account.");
      }
      await loadByRunId(network, runId);
      setToast({ message: "Run resumed." });
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
            walletMode={walletMode}
            onResumeRun={handleResumeRun}
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

function createRunSeed(network: GravenholdNetwork): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  return `${network.profile}-${randomId}`;
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
