import * as Tooltip from "@radix-ui/react-tooltip";
import { type ReactNode } from "react";

import { BuildPanel } from "@/components/game/BuildPanel";
import {
  equipmentSlots,
  slotLabels,
  statIds,
  statLabels,
  statShortLabels,
  type EquipmentSlot,
  type ItemView,
  type RunBundle,
  type StatId,
} from "@/lib/chain/state";
import { itemIconFor } from "@/lib/assets/gameAssets";
import { getEquipmentStatBonus } from "@/lib/game/stats";
import { getItemText, getItemView } from "@/lib/game/runDisplay";
import { statClass } from "@/lib/game/statUi";
import { type PendingAction } from "@/lib/game/pendingAction";

export function CharacterPanel({
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
      <BuildPanel bundle={bundle} />
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

export function DescriptionTooltip({
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

export function ItemBonusList({ item }: { item: ItemView }) {
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

export function RewardComparison({
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
