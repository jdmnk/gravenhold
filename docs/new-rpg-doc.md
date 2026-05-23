# Gravenhold Game Baseline

This document is the current future-facing gameplay baseline. It intentionally omits historical implementation plans.

## Direction

Gravenhold is a deterministic single-player progression RPG.

Core contract:

```txt
same seed + same player choices = same run
```

The player moves through a 20-level path, resolves 3 encounters per level, earns XP, assigns stat points, chooses item rewards, equips build-defining gear, and defeats boss gates by committing to a clear playstyle.

## Current Loop

```txt
start run
resolve encounter choice
gain XP after each encounter
if XP level increases, assign the earned stat point
on failure, lose health
after 3 encounters, choose one reward item
equip or keep item
advance level
repeat through level 20
```

Bosses happen on levels 5, 10, 15, and 20.

## Design Target

The strongest strategy should be specialized but adaptive.

The player should usually have a main stat, but should sometimes pick a different option because it preserves health, reduces strain, improves boss odds, or avoids a bad-fit approach.

Avoid making the best strategy:

```txt
always click the highest stat
```

## Stats

| Stat | Fantasy |
| --- | --- |
| Strength | force, endurance, direct combat, intimidation |
| Intellect | reasoning, persuasion, strategy, traps |
| Agility | speed, stealth, precision, dodging |
| Spirit | willpower, empathy, mystic resistance, morale |

Each focused archetype should be viable.

## Architecture Rules

- Cairo/Dojo is the gameplay source of truth.
- Rule-bearing content lives under `contracts/src`.
- React displays decoded chain state and submits transactions.
- Runtime client code must not import `src/lib/rpg/*`.
- TypeScript RPG code is legacy simulation/reference only until replaced by Cairo tests.
- TypeScript content in `src/lib/rpgContent` is display copy keyed by Cairo numeric IDs.

## New Mechanics Plan

### Stat Strain

Each stat has strain:

```txt
strength_strain: 0..3
intellect_strain: 0..3
agility_strain: 0..3
spirit_strain: 0..3
```

Forecast difficulty adds the chosen stat's current strain:

```txt
final difficulty = approach difficulty + chosen stat strain + boss support penalty
```

After resolving a choice:

```txt
chosen stat strain +1, capped at 3
all other stat strains -1, minimum 0
successful favored choice reduces chosen stat strain by 1
```

This makes repeated same-stat play increasingly costly without banning it.

### Approach Pressure

Approach modifiers:

```txt
favored: -1 difficulty
standard: +0 difficulty
strained: +3 difficulty
```

Strained approach failure also adds 1 extra health loss.

### XP And Stat Points

Encounter choices no longer raise base stats automatically. Each resolved encounter grants XP:

```txt
normal encounter XP = 5 + path level
boss encounter XP = 10 + path level * 2
```

Character XP level is separate from the 20-level path. Each XP level requires slightly more XP:

```txt
XP required = 20 + XP level * 10
```

When the character gains an XP level:

```txt
unspent stat points +1
run enters stat allocation phase
player must assign all unspent stat points before continuing
```

Assigning a stat point increases the selected base stat by 1. Equipment bonuses still apply on top of base stats.

### Failure Damage Pressure

Failure damage:

```txt
base normal failure damage = 1
base boss failure damage = 2
strained approach failure damage = +1
chosen stat strain at 3 = +1
boss support failure penalty = +1
```

### Boss Support Pressure

Bosses should check build support, not only the largest number.

```txt
support stat = second-highest effective stat
required support = floor(level / 3) + 1
```

If support is below the requirement:

```txt
boss difficulty +2
boss failure damage +1
```

This keeps focused builds viable but punishes completely unsupported one-stat builds.

## Initial Tuning Constants

```txt
MAX_STRAIN = 3
STRAIN_DIFFICULTY_PER_POINT = 1
STRAINED_APPROACH_DIFFICULTY = 3
STRAINED_APPROACH_FAILURE_DAMAGE = 1
HIGH_STRAIN_DAMAGE_THRESHOLD = 3
HIGH_STRAIN_FAILURE_DAMAGE = 1
BOSS_SUPPORT_DIFFICULTY_PENALTY = 2
BOSS_SUPPORT_DAMAGE_PENALTY = 1
NORMAL_ENCOUNTER_XP_BASE = 5
BOSS_ENCOUNTER_XP_BASE = 10
BOSS_ENCOUNTER_XP_LEVEL_MULTIPLIER = 2
XP_BASE_REQUIRED = 20
XP_REQUIRED_PER_LEVEL = 10
STAT_POINTS_PER_XP_LEVEL = 1
```

Target outcomes:

```txt
pure same-stat: risky and inefficient
focused adaptive: strongest
highest-current-stat: viable but not always optimal
mixed play: understandable, sometimes survivable
random play: usually weak
```

## Non-Goals Unless Direction Changes

- LLM narration
- multiplayer
- complex combat
- skill trees
- crafting
- shops
- quests
- dialogue trees
- procedural maps
- status-effect bloat
- large inventory systems
