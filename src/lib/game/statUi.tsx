import { statShortLabels, type StatId } from "@/lib/chain/state";

export function statIconFor(stat: StatId): string {
  switch (stat) {
    case "strength":
      return "/assets/game/ui/str-icon.png";
    case "intellect":
      return "/assets/game/ui/intellect-icon.png";
    case "agility":
      return "/assets/game/ui/agi-icon.png";
    case "spirit":
      return "/assets/game/ui/spirit-icon.png";
  }
}

export function statClass(stat: StatId): string {
  return `stat-${stat}`;
}

export function statColorFor(stat: StatId): string {
  switch (stat) {
    case "strength":
      return "#d9553f";
    case "intellect":
      return "#c192ff";
    case "agility":
      return "#70c86f";
    case "spirit":
      return "#e1c661";
  }
}

export function StatChip({ stat, value }: { stat: StatId; value?: number }) {
  return (
    <span className={`stat-chip stat-tone ${statClass(stat)}`}>
      {statShortLabels[stat]}
      {value === undefined ? "" : ` ${value}`}
    </span>
  );
}
