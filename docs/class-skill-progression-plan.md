# Class and Skill Progression Plan

Gravenhold should move from "pick one of four stats every encounter" toward a
more recognizable RPG loop: choose a class, learn class skills, and use those
skills to solve encounters.

This is the current implementation plan. The longer-term gameplay and balance
model lives in `docs/gameplay-progression-framework.md`.

## Goals

- Keep deterministic onchain resolution: the same seed, class, unlocks, and
  choices produce the same run.
- Preserve the existing stat substrate as implementation detail, but make the
  player-facing decisions about class skills.
- Make progression feel like building a character, not only raising numbers.
- Keep the first version compact enough to test and rebalance quickly.

## MVP

At run start, the player chooses one class:

- Vanguard: Strength, endurance, direct force.
- Scholar: Intellect, planning, difficulty manipulation.
- Shade: Agility, evasion, precision.
- Oracle: Spirit, recovery, resistance.

Each class starts with two learned skills: one core skill and one safer survival
skill. XP level-ups now grant stat points
every level and skill points on odd XP levels after level 1. Stat points shape
the build and satisfy skill requirements. Skill points unlock additional class
skills, including bridge skills that require a class primary stat plus a
secondary stat.

Encounter choices become learned skills rather than the four raw stats. A skill
has:

- class ownership
- primary stat
- required unlock state
- difficulty modifier
- failure damage modifier
- optional passive flavor later

The first pass gives each class four skills:

- one core starter skill
- one safer defensive starter skill
- one higher-risk power skill
- one boss/support skill

## First Implementation

- Add `class_id`, `skill_points`, `stat_points`, and `unlocked_skills_bits` to the onchain
  character model.
- Change `start_run` to accept `class_id`.
- Add class and skill constants to Cairo content.
- Add skill forecast and skill choice resolution.
- Replace raw stat allocation with a growth screen that assigns stat points and
  optionally unlocks one skill in a single confirmed action.
- Replace encounter stat buttons with learned skill buttons.
- Keep equipment as stat bonuses for now.

## Later Iterations

- Add passive skills and skill upgrades.
- Add more bridge skills per class.
- Add skill-specific reward hooks.
- Add cooldowns or per-level charges only if choices become too solved.
- Rework gear so items modify skills, not only stat totals.
- Make bosses require different class tools instead of only higher numbers.
