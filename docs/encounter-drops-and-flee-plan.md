# Encounter Drops and Flee Plan

This is the staged gameplay plan after the class/skill/stat framework.

## Pass 1: Two Starting Skills

The current first encounter is too narrow if a class starts with only one skill.
Each class should start with a core skill and a safer survival skill:

- Vanguard: `Force Entry` and `Brace`
- Scholar: `Study Weakness` and `Warded Plan`
- Shade: `Shadow Step` and `Misdirect`
- Oracle: `Steady Heart` and `Mend Will`

The second starter skill should be available immediately, with no prerequisite
and no stat requirement. It should be safer, not strictly stronger:

- slightly worse or more situational success profile
- lower failure damage
- useful when the core skill is a bad fit

This creates real early choices without changing the reward economy yet.

## Pass 2: Encounter Drops

Replace the end-of-level reward screen with deterministic encounter drops.
Implemented first pass: active drops now appear over the encounter image after
an encounter resolves, and picking up all active drops advances the run.

Target behavior:

- After each encounter, deterministic item drops can appear.
- Drops are derived from seed, level, encounter index, class build, and boss
  result.
- Drops appear as clickable item pickups over the encounter image.
- Picking up a drop claims the item into inventory.
- Equipping remains available from inventory.
- Boss encounters can guarantee better or rarer drops.
- The end-of-level reward screen is replaced by the encounter-image drop overlay.

This makes loot more interactive and ties rewards directly to encounter play.

## Pass 3: Flee

Add flee only after encounter drops exist.

Flee behavior:

- skips the current encounter
- grants no XP
- spawns no drops
- gives no reward progress
- disabled on boss encounters

The tradeoff becomes clear: fleeing preserves the run but forfeits the encounter
reward. Do not implement flee before drops, because the current reward screen is
level-based and would make the tradeoff unclear.

## Implementation Order

1. Start every class with two skills.
2. Keep the current reward screen unchanged.
3. Implement deterministic encounter drops.
4. Remove or reduce the end-of-level reward screen.
5. Add flee as a no-XP, no-drop encounter skip.
