import { CallData } from "starknet";

import { type GravenholdNetwork, providerForNetwork } from "./networkConfig";
import {
  classToChainId,
  skillToChainId,
  type ClassId,
  type SkillId,
} from "@/lib/rpgContent/classes";

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
  classId: ClassId,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([seedToFelt(seed), classToChainId[classId]]),
      contractAddress: network.actionsAddress,
      entrypoint: "start_run",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function chooseSkill(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  skillId: SkillId,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, skillToChainId[skillId]]),
      contractAddress: network.actionsAddress,
      entrypoint: "choose_skill",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export async function unlockSkill(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  skillId: SkillId,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([runId, skillToChainId[skillId]]),
      contractAddress: network.actionsAddress,
      entrypoint: "unlock_skill",
    },
  ]);
  await waitForSuccess(network, tx.transaction_hash);
  return tx.transaction_hash;
}

export type GrowthAllocation = {
  agility: number;
  intellect: number;
  spirit: number;
  strength: number;
};

export async function allocateGrowth(
  network: GravenholdNetwork,
  signer: GameSigner,
  runId: bigint,
  allocation: GrowthAllocation,
  skillId: SkillId | null,
): Promise<string> {
  const tx = await signer.execute([
    {
      calldata: CallData.compile([
        runId,
        allocation.strength,
        allocation.intellect,
        allocation.agility,
        allocation.spirit,
        skillId ? skillToChainId[skillId] : 0,
      ]),
      contractAddress: network.actionsAddress,
      entrypoint: "allocate_growth",
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

export async function claimDrop(
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
      entrypoint: "claim_drop",
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
