import {
  statIds,
  type EncounterOption,
  type EncounterOptionApproach,
  type StatId,
} from "../types";

type OptionText = {
  label: string;
  description: string;
  approach?: EncounterOptionApproach;
  difficultyModifier?: number;
};

export type EncounterOptionText = Record<StatId, OptionText>;

export function createEncounterOptions(text: EncounterOptionText): Record<StatId, EncounterOption> {
  return statIds.reduce(
    (options, stat) => ({
      ...options,
      [stat]: {
        stat,
        ...text[stat],
      },
    }),
    {} as Record<StatId, EncounterOption>,
  );
}
