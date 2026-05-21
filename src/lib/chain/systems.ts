import { CallData } from "starknet";

import { type GravenholdNetwork, providerForNetwork } from "./networkConfig";
import { statToChainId, type StatId } from "./state";

export type GameSigner = {
  execute: (calls: Array<{
    calldata: ReturnType<typeof CallData.compile>;
    contractAddress: string;
    entrypoint: string;
  }>) => Promise<{ transaction_hash: string }>;
};

async function waitForSuccess(network: GravenholdNetwork, hash: string) {
  await providerForNetwork(network).waitForTransaction(hash, { retryInterval: 1000 });
}

export async function startRun(
  network: GravenholdNetwork,
  signer: GameSigner,
  seed: string,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([seedToFelt(seed)]),
      contractAddress: network.actionsAddress,
      entrypoint: "start_run",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function chooseOption(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  stat: StatId,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, statToChainId[stat]]),
      contractAddress: network.actionsAddress,
      entrypoint: "choose_option",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function assignStatPoint(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  stat: StatId,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, statToChainId[stat]]),
      contractAddress: network.actionsAddress,
      entrypoint: "assign_stat_point",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function chooseReward(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  rewardIndex: number,
  equipNow: boolean,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, rewardIndex, equipNow ? 1 : 0]),
      contractAddress: network.actionsAddress,
      entrypoint: "choose_reward",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function equipItem(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  itemId: number,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, itemId]),
      contractAddress: network.actionsAddress,
      entrypoint: "equip_item",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export function seedToFelt(seed: string): bigint {
  let hash = BigInt(2166136261);
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= BigInt(seed.charCodeAt(index));
    hash = (hash * BigInt(16777619)) & BigInt(0xffffffff);
  }
  return hash === BigInt(0) ? BigInt(1) : hash;
}
