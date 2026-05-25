# Gameplay Progression Framework

This document is the long-term design model for Gravenhold gameplay. It is not
only a snapshot of the current implementation. It describes the system we should
keep building toward over months: deterministic runs, class identity, stat
investment, skill unlocks, equipment, encounter pressure, boss gates, and
balance rules that can survive new content.

## Research Anchors

The framework combines a few established design ideas:

- MDA: define the desired player experience first, then design dynamics and
  mechanics that reliably create it.
  https://www.cs.northwestern.edu/~hunicke/MDA.pdf
- Meaningful decisions: choices should be situational, personal, and have
  feedback. A choice is weak if one option is always correct.
  https://www.gamefront.com/news/gdc-2012-sid-meiers-decision-based-design-philosophy
- Dominant strategy control: avoid any class, stat, skill, item, or route that
  is clearly best in nearly every state.
  https://en.wikipedia.org/wiki/Game_balance
- Intransitive balance: use "A beats B, B beats C, C beats A" relationships to
  create variety and prevent a single stat or skill family from solving
  everything.
  https://en.wikipedia.org/wiki/Game_balance
- Bounded accuracy: keep pass/fail math in a constrained readable range. Let
  late-game growth express itself through more options, better mitigation,
  stronger rewards, boss readiness, and controlled power spikes rather than
  runaway chance-to-pass numbers.
  https://www.aidedd.org/adj/articles/bounded-accuracy/
- Economy modeling: treat XP, HP, strain, stat points, skill points, item
  choices, and unlocks as resources flowing through sources, pools, converters,
  and drains.
  https://machinations.gitbook.io/docs/getting-started/framework-basics
- Role-based class design: classes need a clear job, but roles should guide
  identity instead of trapping the player.
  https://dungeonsdragons.fandom.com/wiki/Role
- Lenticular design: early choices should be obvious enough for new players but
  deep enough that experienced players see extra uses later.
  https://magic.wizards.com/en/news/making-magic/lenticular-design-2014-03-31
- Roguelike buildcraft: durable depth comes from layered decisions, synergies,
  risk/reward routing, and repeated playtesting rather than a huge amount of
  content.
  https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-

## Target Experience

Gravenhold should feel like a compact onchain fantasy RPG where the player is
not asking "which raw stat button is highest?" but "what kind of character am I
building, what tools have I earned, and what risk am I willing to take now?"

The target aesthetics are:

- Challenge: the run should push HP, strain, build quality, and boss readiness.
- Fantasy: Strength, Intellect, Agility, and Spirit should feel like different
  ways of surviving Gravenhold.
- Expression: a Vanguard should not always become the same Vanguard. Each class
  should support at least two credible builds.
- Discovery: repeated runs should reveal skill/item synergies and encounter
  patterns.
- Mastery: because the game is deterministic, better play means understanding
  the system, not hoping for luck.

## Core Design Claim

Stats should not be the main encounter buttons. Skills should be the verbs.
Stats should be the build substrate that unlocks, scales, and bends those verbs.

That means:

- A stat point says "my character is becoming more this kind of person."
- A skill point says "my character has learned a new thing they can do."
- An item says "my current build now has a sharper strength, a covered weakness,
  or a tempting new branch."
- An encounter says "this part of the world tests one or more kinds of strength."

This keeps the stat system useful without returning to the old version where
the player simply picked Strength, Intellect, Agility, or Spirit every round.

## System Layers

### 1. Class

A class is identity and starting direction. It defines:

- starter skill
- primary stat
- two supported secondary stats
- weak stat
- role fantasy
- early skill lane
- boss answer

Classes should not be sealed boxes. They should make some builds easier and
others harder.

```text
ClassDefinition {
  id
  name
  fantasy
  primary_stat
  secondary_stats[2]
  weak_stat
  starter_skill
  role_tags
  default_lane
}
```

Suggested class roles:

```text
Vanguard
  primary: Strength
  secondaries: Spirit, Agility
  weak: Intellect
  role: defender / bruiser
  wins by: absorbing pressure, forcing direct solutions, converting HP into momentum

Scholar
  primary: Intellect
  secondaries: Spirit, Agility
  weak: Strength
  role: controller / planner
  wins by: reducing difficulty, improving rewards, preparing for boss gates

Shade
  primary: Agility
  secondaries: Intellect, Strength
  weak: Spirit
  role: striker / evasive opportunist
  wins by: high-risk precision, avoiding damage, exploiting reward windows

Oracle
  primary: Spirit
  secondaries: Intellect, Strength
  weak: Agility
  role: support / survivor
  wins by: recovery, resisting strain, stabilizing bad runs, mystical boss answers
```

### 2. Stats

Stats are long-term investment axes. They must matter in three ways:

- Requirements: unlock certain skills or skill upgrades.
- Scaling: improve the reliability or effect of matching skills.
- Side effects: create small passive identity, such as HP, strain resistance, or
  reward quality.

Stats should not grow without bounds. Use bounded ranges so the game remains
legible.

```text
StatDefinition {
  id
  name
  fantasy
  primary_effect
  passive_effect
  supported_encounter_tags
}
```

Recommended stat identities:

```text
Strength
  primary: force, endurance, intimidation, physical survival
  passive: small max HP or lower physical failure damage

Intellect
  primary: reasoning, tactics, social reading, traps, ancient systems
  passive: better forecasts, reward filtering, or difficulty reduction hooks

Agility
  primary: speed, stealth, precision, opportunism
  passive: lower failure damage on near misses or better escape outcomes

Spirit
  primary: willpower, empathy, ritual, fear resistance, corruption resistance
  passive: strain resistance, recovery, boss gate stability
```

### 3. Skills

Skills are what the player actually chooses in encounters. Every skill belongs
to a class but may depend on one or two stats.

A good skill has:

- a clear fantasy verb
- an encounter tag profile
- one primary stat
- optional bridge stat
- unlock requirements
- resolution modifiers
- a downside or opportunity cost
- at least one synergy hook

```text
SkillDefinition {
  id
  class_id
  name
  lane
  primary_stat
  bridge_stat_optional
  required_level
  required_stats
  prerequisite_skills
  tags
  base_difficulty_modifier
  failure_damage_modifier
  strain_modifier
  reward_modifier
  boss_support
  synergy_tags
}
```

Skill lanes:

```text
Core
  The class fantasy. Reliable, readable, useful often.

Survival
  Reduces HP loss, strain, or catastrophic failure. Usually lower reward output.

Power
  Higher reward or boss progress, but worse failure damage or narrower tags.

Bridge
  Requires primary plus secondary stat investment. Opens hybrid play.

Capstone
  Late-run identity. Strong, but should require prior commitment.
```

Bridge skills are the best reason to keep stat points. They let the player build
a Vanguard that leans Spirit, a Scholar that leans Agility, a Shade that leans
Intellect, or an Oracle that leans Strength without making every class blend
into the same thing.

### 4. Encounters

Encounters are tests. They should not merely be "difficulty number plus flavor."
Each encounter should say which kinds of verbs are natural, which are risky, and
what resource is under pressure.

```text
EncounterDefinition {
  id
  act
  level_band
  tags
  base_difficulty
  pressure_type
  reward_profile
  boss_relevance
  stat_affinities
  counter_affinities
}
```

Pressure types:

```text
HP_PRESSURE
  Tests whether the build can absorb or avoid damage.

STRAIN_PRESSURE
  Tests Spirit, planning, and long-run stability.

DIFFICULTY_PRESSURE
  Tests raw ability to pass hard checks.

REWARD_PRESSURE
  Offers greed: better rewards if the player accepts harder checks.

BOSS_PREP_PRESSURE
  Gives explicit ways to prepare for a coming gate.
```

Encounter design should follow a rotation so every build gets moments of
comfort and moments of stress.

```text
EncounterBand {
  levels 1-5:
    teach primary class verbs
    low bridge pressure
    forgiving failure damage

  levels 6-10:
    introduce secondary stat tests
    offer first bridge unlocks
    start boss preparation

  levels 11-15:
    punish one-dimensional builds sometimes
    reward planned synergies
    increase strain and reward pressure

  levels 16-20:
    ask whether the build has a real identity
    test boss answers
    allow strong but earned power spikes
}
```

### 5. Items

Items should be build-defining, not just bigger stat sticks. A good item either:

- sharpens a chosen lane
- covers a real weakness
- enables a bridge skill
- changes risk/reward math
- improves boss readiness

```text
ItemDefinition {
  id
  name
  slot
  stat_bonus
  tags
  modifies_skill_tags
  modifies_pressure_types
  tradeoff_optional
}
```

Examples:

```text
Iron Saint's Buckle
  +Strength
  lowers HP failure damage for Core skills

Mirror Quill
  +Intellect
  improves reward quality after Controller-tag skills

Ashstep Boots
  +Agility
  reduces damage on failed Power skills

Votive Chain
  +Spirit
  reduces strain and improves boss support skills
```

## Resource Economy

The game should be modeled as resource flows:

```text
Sources:
  encounters -> XP
  rewards -> items
  level ups -> stat points and skill points
  certain skills/items -> HP recovery, strain recovery, reward improvement

Pools:
  HP
  strain
  XP
  level
  stat points
  skill points
  unlocked skills
  equipment
  boss readiness

Converters:
  XP -> level
  level -> stat points / skill points
  stat points + skill points -> skill unlocks
  equipment -> effective stats / skill modifiers
  skills -> encounter outcomes

Drains:
  failed encounters -> HP loss
  risky skills -> strain
  boss gates -> readiness check
  greedy reward choices -> higher immediate risk
```

This lets us inspect balance by asking:

- What creates this resource?
- What spends or drains it?
- Can it loop into itself for free?
- Can one resource become the only resource that matters?
- Can a failed player recover through good choices?

## Progression Model

Use two point types:

- Stat points: frequent, small, identity-building.
- Skill points: less frequent, unlock verbs and upgrades.

Recommended cadence for a 20-level run:

```text
Every level:
  +1 stat point

Odd levels after level 1:
  +1 skill point

Boss levels:
  may grant a bonus skill point or special item choice
```

This gives a steady reason to visit the growth screen while preventing skill
trees from filling too quickly.

XP requirements should increase gradually but predictably:

```text
xp_required_for_next_level(level):
  base = 8
  linear = level * 3
  soft_curve = floor(level * level / 3)
  return base + linear + soft_curve
```

The curve should not be tuned in isolation. It should be tuned against expected
XP per encounter and desired level-ups per run segment.

```text
expected_xp_per_level =
  encounters_per_level * average_xp_per_encounter

target:
  early levels: level every 1-2 levels of play
  mid levels: level every 2 levels of play
  late levels: level every 2-3 levels of play
```

## Skill Unlock Rules

The player should usually be choosing between:

- improving the main class plan
- unlocking survival
- branching into a bridge
- saving for a stronger upcoming unlock

Pseudocode:

```text
can_unlock_skill(character, skill):
  if character.skill_points < skill.cost:
    return false

  if character.level < skill.required_level:
    return false

  if character.class_id != skill.class_id:
    return false

  for prerequisite in skill.prerequisite_skills:
    if not character.has_skill(prerequisite):
      return false

  for requirement in skill.required_stats:
    if character.base_stat(requirement.stat) < requirement.value:
      return false

  return true
```

Bridge requirement examples:

```text
Vanguard + Spirit
  "Oathbreaker's Stand"
  requires Strength 4, Spirit 3
  reliable under fear/corruption pressure

Vanguard + Agility
  "Shield Rush"
  requires Strength 4, Agility 3
  lower difficulty against ambush/mobility encounters

Scholar + Spirit
  "True Name"
  requires Intellect 4, Spirit 3
  strong boss support, moderate strain cost

Scholar + Agility
  "Rapid Deduction"
  requires Intellect 4, Agility 3
  improves risky reward-pressure encounters

Shade + Intellect
  "Ghost Plan"
  requires Agility 4, Intellect 3
  high reward, safer if forecast is favorable

Shade + Strength
  "Killing Momentum"
  requires Agility 4, Strength 3
  strong after recent success, punishing on failure

Oracle + Intellect
  "Pattern Trance"
  requires Spirit 4, Intellect 3
  reduces difficulty and strain in ancient/mystic encounters

Oracle + Strength
  "Martyr's Grip"
  requires Spirit 4, Strength 3
  converts HP pressure into boss readiness or recovery
```

## Encounter Resolution

The current game can still use deterministic roll-like resolution, but the
player-facing model should be skill-first.

Pseudocode:

```text
forecast_skill(character, encounter, skill, seed_state):
  effective_stat =
    character.base_stat(skill.primary_stat)
    + character.item_bonus(skill.primary_stat)
    + matching_item_skill_bonus(character, skill, encounter)

  bridge_bonus = 0
  if skill.bridge_stat exists:
    bridge_bonus = floor(character.effective_stat(skill.bridge_stat) / 3)

  tag_bonus = count_matching_tags(skill.tags, encounter.tags)

  difficulty =
    encounter.base_difficulty
    + encounter_pressure_modifier(encounter)
    + act_difficulty_modifier(character.level)
    + skill.base_difficulty_modifier
    - tag_bonus
    - bridge_bonus

  bounded_score =
    clamp(effective_stat, MIN_EFFECTIVE_STAT, MAX_EFFECTIVE_STAT)

  success_margin =
    deterministic_roll(seed_state)
    + bounded_score
    - difficulty

  return Forecast {
    success_chance_band
    expected_damage_on_fail
    expected_xp
    expected_reward_quality
    boss_readiness_delta
    strain_delta
  }
```

Resolution:

```text
resolve_skill(character, encounter, skill, seed_state):
  forecast = forecast_skill(character, encounter, skill, seed_state)

  if forecast.success_margin >= 0:
    character.xp += xp_reward(encounter, skill, forecast)
    character.strain += success_strain_delta(skill, encounter)
    maybe_add_boss_readiness(character, skill, encounter)
    write_choice_log(success)
  else:
    character.hp -= failure_damage(character, encounter, skill, forecast)
    character.strain += failure_strain_delta(skill, encounter)
    character.xp += partial_failure_xp(encounter)
    write_choice_log(failure)

  process_level_ups(character)
  advance_or_open_reward(character)
```

Important: failure can hurt, but it should usually move the run forward. If
failure gives no XP, no knowledge, and only HP loss, the deterministic run can
feel like a dead end.

## Bounded Math

Gravenhold should use bounded probability bands:

```text
Very Risky: 20-35%
Risky:      36-50%
Even:       51-65%
Favored:    66-80%
Strong:     81-90%
```

Avoid regular encounter forecasts above 90%. Avoid regular forecasts below 20%
unless the UI clearly marks the choice as desperate or greedy.

The game should grow by adding:

- more skills
- better damage control
- better reward control
- stronger bridge bonuses
- boss readiness
- situational power spikes

It should not grow by making the best stat automatically pass every check.

## Balance Matrix

Every class should have:

- 1 reliable core path
- 1 defensive/survival path
- 1 high-risk reward path
- 2 bridge paths
- 1 boss answer
- 1 weakness that appears often enough to matter but not so often that the class
  feels punished

Balance table template:

```text
Class      Primary       Safe Tool       Greed Tool       Bridge A       Bridge B       Weakness
Vanguard   Strength      damage control  force reward     Spirit oath    Agility rush   puzzles/social traps
Scholar    Intellect     difficulty cut  reward control   Spirit names   Agility read   raw endurance
Shade      Agility       evasion         precision loot   Intellect plan Strength kill  corruption/fear
Oracle     Spirit        recovery        ritual payoff    Intellect lore Strength vow   speed/ambush
```

Encounter table template:

```text
Encounter Tag      Natural Stats          Punishes             Rewards
Brute Force        Strength, Spirit       low HP               survival items
Ancient Device     Intellect, Agility     low forecast tools   reward quality
Ambush             Agility, Strength      slow builds          damage avoidance
Corruption         Spirit, Intellect      low strain control   boss readiness
Negotiation        Intellect, Spirit      one-note force       XP/reward choice
Hazard             Agility, Spirit        greed                HP preservation
```

The encounter set for each act should include all tags, but not evenly. Uneven
distribution creates texture. Total absence creates dead builds.

## Anti-Dominance Rules

Before adding or tuning a skill, check:

```text
for each skill:
  if skill is better than another skill in reliability, damage, reward, and boss support:
    reject or add a tradeoff

for each class:
  if one stat path has best average forecast and best survival and best rewards:
    add encounter counters or reduce scaling

for each item:
  if item is correct for every build of that class:
    make it narrower, add tradeoff, or move power into a tag condition

for each bridge:
  if bridge is mandatory for all successful runs:
    lower bridge power or improve non-bridge alternatives
```

Tradeoff menu:

```text
Higher success chance -> lower reward quality
Higher reward quality -> more failure damage
Boss support -> worse regular encounter efficiency
Recovery -> lower XP
Power skill -> strain cost
Bridge flexibility -> higher stat requirements
Item weakness coverage -> lower peak stat bonus
```

## Growth Screen Model

The growth screen should combine stat points and skill points into one character
growth moment. It should feel like shaping a character, not filling a form.

Recommended screen behavior:

```text
GrowthScreen {
  top:
    class identity, level, available stat points, available skill points

  stats:
    list of four stats
    each row shows fantasy label, current value, plus/minus allocation controls
    show unlock hints affected by pending allocation

  skills:
    grouped by lane
    show available, locked by stat, locked by prerequisite, learned
    show what pending stat allocations would unlock

  confirm:
    one commit button submits stat allocations and skill unlocks if possible
}
```

Implementation note: because Cairo is the source of truth, pending local UI
allocation is only a preview. The actual confirm action must call onchain
systems that validate stat points, skill points, prerequisites, and requirements.

## Boss Gates

Bosses should not only ask "is your biggest stat high enough?" They should ask
whether the build has prepared an answer.

Boss readiness can come from:

- specific skill tags
- class capstone
- bridge skill
- boss-prep encounters
- equipment tags
- controlled sacrifice, such as strain or HP risk

Pseudocode:

```text
resolve_boss_gate(character, boss):
  readiness =
    class_boss_base(character.class_id, boss)
    + learned_skill_boss_support(character.skills, boss.tags)
    + equipment_boss_support(character.items, boss.tags)
    + stat_boss_support(character.effective_stats, boss.stat_affinities)
    - strain_penalty(character.strain)

  if readiness >= boss.required_readiness:
    pass_boss()
  else:
    character.hp -= boss_failure_damage(readiness)
    maybe_offer_recovery_or_last_stand()
```

Each boss should have multiple valid answers, but the player should be able to
read why their build passed or failed.

## Content Authoring Rules

When adding a new skill:

1. Name the fantasy verb.
2. Pick one class and one lane.
3. Pick primary stat and optional bridge stat.
4. Define what encounter tags it likes.
5. Define one weakness or cost.
6. Define one synergy hook.
7. Add a test proving unlock requirements.
8. Add a test proving encounter resolution effect.
9. Add UI copy only after the Cairo behavior is stable.

When adding a new encounter:

1. Pick pressure type.
2. Pick two natural stat/skill families.
3. Pick one family that struggles.
4. Set reward profile.
5. Check the act matrix so no class is starved for relevant tests.
6. Add deterministic test coverage if it changes rule behavior.

When adding a new item:

1. Decide whether it sharpens, covers, bridges, or tempts.
2. Avoid unconditional best-in-slot.
3. Use tags where possible instead of broad global bonuses.
4. Check whether it creates an infinite resource loop.

## Determinism Rules

All gameplay-affecting randomness must be derived from:

```text
seed
run_id
level
encounter_index
choice_index
skill_id
reward_index
```

Never use client randomness for:

- success/failure
- damage
- XP
- rewards
- level-up output
- unlock availability
- boss outcomes

The client can animate, preview, and explain. Cairo decides.

## Testing Strategy

Use tests as balance guardrails:

```text
Class start tests:
  every class starts with exactly one starter skill
  starter skill belongs to class

Stat allocation tests:
  cannot spend unavailable stat points
  pending allocations do not affect chain until confirmed

Skill unlock tests:
  cannot unlock wrong-class skill
  cannot unlock missing prerequisite
  cannot unlock missing stat requirement
  bridge skill unlocks after correct stat investment

Resolution tests:
  learned skill can resolve encounter
  locked skill cannot resolve encounter
  matching tag improves forecast
  risky skill has higher downside than safe skill

Progression tests:
  XP levels up at expected thresholds
  stat points and skill points are granted at intended cadence
  failure still grants intended partial progress, if enabled

Balance smoke tests:
  every class can complete a seeded run under baseline choices
  every primary path sees at least one favorable and one unfavorable encounter
  no starter skill dominates every other starter across the encounter matrix
```

## Implementation Shape

The long-term onchain model should eventually look roughly like this:

```text
Character {
  run_id
  class_id
  level
  xp
  hp
  max_hp
  strain
  stat_points
  skill_points
  base_strength
  base_intellect
  base_agility
  base_spirit
  unlocked_skills_bits
  boss_readiness
}

Skill {
  id
  class_id
  lane
  primary_stat
  bridge_stat
  required_level
  required_strength
  required_intellect
  required_agility
  required_spirit
  prerequisite_skill_id
  tags_bits
  difficulty_modifier
  failure_damage_modifier
  strain_modifier
  reward_modifier
  boss_support
}

Encounter {
  id
  level
  index
  tags_bits
  pressure_type
  base_difficulty
  reward_profile
  boss_relevance
}
```

System calls:

```text
start_run(seed, class_id)
choose_skill(run_id, skill_id)
choose_reward(run_id, reward_id)
equip_item(run_id, item_id)
allocate_growth(run_id, stat_allocations, optional_skill_unlock_id)
get_skill_forecast(run_id, skill_id)
get_growth_preview(run_id, stat_allocations)
```

The combined `allocate_growth` call is preferable long-term because it lets the
player preview "add +1 Spirit, now this bridge skill becomes available, unlock
it" and confirm the whole growth decision as one character moment.

## Design Invariants

These should stay true even after months of new content:

- Same seed plus same choices produces same run.
- Skills are the encounter verbs; stats are the build substrate.
- Every class has at least two viable builds.
- Every stat has a reason to exist outside its own class.
- Bridge skills create hybrid identity, not mandatory optimization.
- No class, stat, skill, item, or route is correct in every situation.
- Failure costs resources but usually preserves forward motion.
- Bosses test preparation, not only one large number.
- UI previews can explain but never decide gameplay.
- New content must fit the matrix before it enters the game.
