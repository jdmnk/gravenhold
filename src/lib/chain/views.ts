import { CallData } from "starknet";

import { type GravenholdNetwork, providerForNetwork } from "./networkConfig";
import {
  decodeCharacter,
  decodeChoiceForecast,
  decodeChoiceLog,
  decodeCurrentEncounter,
  decodeItem,
  decodeRewardOffer,
  decodeRun,
  inventoryItemIds,
  statIds,
  type ItemView,
  type RunBundle,
} from "./state";

async function view(
  network: GravenholdNetwork,
  entrypoint: string,
  calldata: Array<string | number | bigint> = [],
): Promise<string[]> {
  return providerForNetwork(network).callContract({
    calldata: CallData.compile(calldata),
    contractAddress: network.actionsAddress,
    entrypoint,
  });
}

export async function getActiveRunId(network: GravenholdNetwork, player: string): Promise<bigint> {
  const felts = await view(network, "active_run_id", [player]);
  return BigInt(felts[0] ?? "0");
}

export async function getRun(network: GravenholdNetwork, runId: bigint) {
  return decodeRun(await view(network, "get_run", [runId]));
}

export async function getCharacter(network: GravenholdNetwork, runId: bigint) {
  return decodeCharacter(await view(network, "get_character", [runId]));
}

export async function getCurrentEncounter(network: GravenholdNetwork, runId: bigint) {
  return decodeCurrentEncounter(await view(network, "get_current_encounter", [runId]));
}

export async function getChoiceForecast(
  network: GravenholdNetwork,
  runId: bigint,
  statId: number,
) {
  return decodeChoiceForecast(await view(network, "get_choice_forecast", [runId, statId]));
}

export async function getChoiceLog(network: GravenholdNetwork, runId: bigint, index: number) {
  return decodeChoiceLog(await view(network, "get_choice_log", [runId, index]));
}

export async function getRewardOffer(network: GravenholdNetwork, runId: bigint, index: number) {
  return decodeRewardOffer(await view(network, "get_reward_offer", [runId, index]));
}

export async function getItem(network: GravenholdNetwork, itemId: number) {
  return decodeItem(await view(network, "get_item", [itemId]));
}

export async function loadRunBundle(network: GravenholdNetwork, runId: bigint): Promise<RunBundle> {
  const [run, character] = await Promise.all([
    getRun(network, runId),
    getCharacter(network, runId),
  ]);
  const recentStart = Math.max(0, run.choiceCount - 8);
  const recentChoiceIndexes = Array.from(
    { length: run.choiceCount - recentStart },
    (_value, offset) => recentStart + offset,
  );

  const [currentEncounter, forecastList, rewards, recentChoices] = await Promise.all([
    run.phase === "encounter" ? getCurrentEncounter(network, runId) : Promise.resolve(null),
    run.phase === "encounter"
      ? Promise.all(statIds.map((_stat, index) => getChoiceForecast(network, runId, index)))
      : Promise.resolve(null),
    run.phase === "reward"
      ? Promise.all([0, 1, 2].map((index) => getRewardOffer(network, runId, index)))
      : Promise.resolve([]),
    Promise.all(recentChoiceIndexes.map((index) => getChoiceLog(network, runId, index))),
  ]);
  const itemIds = uniquePositiveIds([
    ...Object.values(character.equipment),
    ...inventoryItemIds(character.inventoryBits),
    ...rewards.map((reward) => reward.itemId),
  ]);
  const itemEntries = await Promise.all(
    itemIds.map(async (itemId) => [itemId, await getItem(network, itemId)] as const),
  );

  return {
    character,
    currentEncounter,
    forecasts: forecastList
      ? {
          agility: forecastList[2],
          intellect: forecastList[1],
          spirit: forecastList[3],
          strength: forecastList[0],
        }
      : null,
    items: itemEntries.reduce<Record<number, ItemView>>((accumulator, [itemId, item]) => {
      if (item.exists) {
        accumulator[itemId] = item;
      }
      return accumulator;
    }, {}),
    recentChoices: recentChoices.reverse(),
    rewards: rewards.filter((reward) => reward.active),
    run,
  };
}

function uniquePositiveIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((id) => id > 0)));
}
