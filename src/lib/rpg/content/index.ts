import type { GameContent } from "../types";
import { bossEncounters } from "./bosses";
import { fixedEncounters, randomEncounters } from "./encounters";
import { items } from "./items";
import { story } from "./story";

export const defaultGameContent: GameContent = {
  bossEncounters,
  fixedEncounters,
  items,
  randomEncounters,
  story,
};

export { bossEncounters, fixedEncounters, items, randomEncounters, story };
