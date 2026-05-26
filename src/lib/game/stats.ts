import {
  equipmentSlots,
  statIds,
  type RunBundle,
  type StatId,
} from "@/lib/chain/state";

function getItemView(bundle: RunBundle, id: number) {
  const item = bundle.items[id];
  if (!item) {
    throw new Error(`Missing onchain item metadata for ${id}.`);
  }
  return item;
}

export function getEquipmentStatBonus(bundle: RunBundle, stat: StatId): number {
  return equipmentSlots.reduce((total, slot) => {
    const itemId = bundle.character.equipment[slot];
    if (itemId <= 0) return total;
    return total + (getItemView(bundle, itemId).bonuses[stat] ?? 0);
  }, 0);
}

export function getEffectiveStat(bundle: RunBundle, stat: StatId): number {
  return bundle.character.baseStats[stat] + getEquipmentStatBonus(bundle, stat);
}

export function getDominantEffectiveStat(bundle: RunBundle): StatId {
  return statIds.reduce((dominant, stat) =>
    getEffectiveStat(bundle, stat) > getEffectiveStat(bundle, dominant)
      ? stat
      : dominant,
  );
}

export function getSecondHighestEffectiveStat(bundle: RunBundle): StatId {
  const sorted = [...statIds].sort(
    (first, second) =>
      getEffectiveStat(bundle, second) - getEffectiveStat(bundle, first),
  );
  return sorted[1] ?? sorted[0];
}
