import type { GravenholdNetwork } from "@/lib/chain/networkConfig";
import {
  type ChoiceLogView,
  type CurrentEncounterView,
  type EquipmentSlot,
  type ItemView,
  type RunBundle,
  type StatId,
} from "@/lib/chain/state";
import { encounterText, itemText } from "@/lib/rpgContent/generatedText";

export function choiceLogKey(log: ChoiceLogView): string {
  return `${log.runId}-${log.index}`;
}

export function getEncounterText(id: number) {
  const text = encounterText[id as keyof typeof encounterText];
  if (!text) {
    throw new Error(`Missing encounter text for ${id}.`);
  }
  return text;
}

export function getItemText(id: number) {
  const text = itemText[id as keyof typeof itemText];
  if (!text) {
    throw new Error(`Missing item text for ${id}.`);
  }
  return text;
}

export function getItemView(bundle: RunBundle, id: number): ItemView {
  const item = bundle.items[id];
  if (!item) {
    throw new Error(`Missing onchain item metadata for ${id}.`);
  }
  return item;
}

export function getEquippedItemForSlot(
  bundle: RunBundle,
  slot: EquipmentSlot,
): ItemView | null {
  const itemId = bundle.character.equipment[slot];
  return itemId > 0 ? getItemView(bundle, itemId) : null;
}

export function getLatestChoiceLog(bundle: RunBundle): ChoiceLogView | null {
  return bundle.recentChoices.reduce<ChoiceLogView | null>(
    (latest, log) => (!latest || log.index > latest.index ? log : latest),
    null,
  );
}

export function getRunStepLabel(bundle: RunBundle): string {
  if (bundle.run.phase === "encounter")
    return `${bundle.run.encounterIndex + 1}/3`;
  if (bundle.run.phase === "growth") return "Growth";
  if (bundle.run.phase === "reward") return "Drops";
  return "Complete";
}

export function getPhaseLabel(phase: RunBundle["run"]["phase"]): string {
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

export function getBossEncounterId(level: number): number | null {
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

export function getHealthPercent(bundle: RunBundle): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round((bundle.character.health / bundle.character.maxHealth) * 100),
    ),
  );
}

export function getEncounterXp(encounter: CurrentEncounterView): number {
  const boss =
    encounter.source === "boss" || encounter.difficultyKind === "boss";
  return boss ? 10 + encounter.level * 2 : 5 + encounter.level;
}

export function getXpRequiredForLevel(xpLevel: number): number {
  return 8 + xpLevel * 3 + Math.floor((xpLevel * xpLevel) / 3);
}

export function getXpPercent(bundle: RunBundle): number {
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

export function formatNetworkBadge(network: GravenholdNetwork): string {
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

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getItemPrimaryStat(item: ItemView): StatId {
  const statIds: StatId[] = ["strength", "intellect", "agility", "spirit"];
  return statIds.reduce((primary, stat) =>
    (item.bonuses[stat] ?? 0) > (item.bonuses[primary] ?? 0) ? stat : primary,
  );
}

export function getStatGrowthDescription(stat: StatId): string {
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

export function stringifyBigInt(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}
