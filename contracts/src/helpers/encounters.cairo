use core::poseidon::poseidon_hash_span;
use crate::constants::{
    BOSS_DIFFICULTY_OFFSET, BOSS_FAILURE_DAMAGE, BOSS_SUPPORT_DAMAGE_PENALTY,
    BOSS_SUPPORT_DIFFICULTY_PENALTY, ENCOUNTERS_PER_LEVEL, HARD_DIFFICULTY_OFFSET,
    HIGH_STRAIN_DAMAGE_THRESHOLD, HIGH_STRAIN_FAILURE_DAMAGE, MAX_LEVEL, MAX_STRAIN,
    NORMAL_DIFFICULTY_OFFSET, NORMAL_FAILURE_DAMAGE, SIGN_NEGATIVE, SIGN_POSITIVE, SIGN_ZERO,
    SOURCE_BOSS, SOURCE_FIXED, SOURCE_RANDOM, STRAIN_DIFFICULTY_PER_POINT,
    STRAINED_APPROACH_DIFFICULTY, STRAINED_APPROACH_FAILURE_DAMAGE,
};
use crate::content::data::{
    APPROACH_FAVORED, APPROACH_STRAINED, DIFFICULTY_BOSS, DIFFICULTY_HARD,
    RANDOM_ENCOUNTER_COUNT, STAT_AGILITY, STAT_INTELLECT, STAT_SPIRIT, STAT_STRENGTH,
    boss_encounter_id, encounter_category, encounter_difficulty, fixed_encounter_id,
    option_approach, random_encounter_id, skill_difficulty_penalty, skill_difficulty_reduction,
    skill_exists, skill_failure_damage_penalty, skill_failure_damage_reduction, skill_stat,
};
use crate::helpers::items;
use crate::models::index::{Character, ChoiceForecast, CurrentEncounter, Run};

pub fn is_boss_level(level: u8) -> bool {
    level == 5 || level == 10 || level == 15 || level == 20
}

pub fn is_valid_stat(stat: u8) -> bool {
    stat == STAT_STRENGTH || stat == STAT_INTELLECT || stat == STAT_AGILITY || stat == STAT_SPIRIT
}

pub fn skill_mask(skill_id: u16) -> u64 {
    let mut mask: u64 = 1;
    let mut cursor: u16 = 1;
    while cursor < skill_id {
        mask *= 2;
        cursor += 1;
    }
    mask
}

pub fn skill_unlocked(character: @Character, skill_id: u16) -> bool {
    if !skill_exists(skill_id) {
        return false;
    }

    let mask = skill_mask(skill_id);
    ((*character.unlocked_skills_bits / mask) % 2) == 1
}

pub fn unlock_skill(mut character: Character, skill_id: u16) -> Character {
    if !skill_unlocked(@character, skill_id) {
        character.unlocked_skills_bits += skill_mask(skill_id);
    }
    character
}

pub fn is_final_encounter(encounter_index: u8) -> bool {
    encounter_index >= ENCOUNTERS_PER_LEVEL - 1
}

fn random_index(seed: felt252, level: u8, random_slot: u8) -> u8 {
    let raw = poseidon_hash_span([seed, level.into(), random_slot.into()].span());
    let raw_u256: u256 = raw.into();
    let count: u256 = RANDOM_ENCOUNTER_COUNT.into();
    (raw_u256 % count).try_into().unwrap()
}

fn random_encounter_for(seed: felt252, level: u8, random_slot: u8) -> u16 {
    let first_index = random_index(seed, level, 1);
    let mut index = first_index;
    if random_slot == 2 {
        index = random_index(seed, level, 2);
        if index == first_index {
            index = (index + 1) % RANDOM_ENCOUNTER_COUNT;
        }
    }
    random_encounter_id(index)
}

pub fn difficulty_value(level: u8, difficulty_kind: u8) -> u16 {
    if difficulty_kind == DIFFICULTY_BOSS {
        level.into() + BOSS_DIFFICULTY_OFFSET
    } else if difficulty_kind == DIFFICULTY_HARD {
        level.into() + HARD_DIFFICULTY_OFFSET
    } else {
        level.into() + NORMAL_DIFFICULTY_OFFSET
    }
}

fn modifier_sign(approach: u8) -> u8 {
    if approach == APPROACH_FAVORED {
        SIGN_NEGATIVE
    } else if approach == APPROACH_STRAINED {
        SIGN_POSITIVE
    } else {
        SIGN_ZERO
    }
}

fn modifier_amount(approach: u8) -> u16 {
    if approach == APPROACH_FAVORED {
        1
    } else if approach == APPROACH_STRAINED {
        STRAINED_APPROACH_DIFFICULTY
    } else {
        0
    }
}

pub fn option_difficulty(base_difficulty: u16, approach: u8) -> u16 {
    if approach == APPROACH_FAVORED {
        if base_difficulty > 1 {
            base_difficulty - 1
        } else {
            1
        }
    } else if approach == APPROACH_STRAINED {
        base_difficulty + STRAINED_APPROACH_DIFFICULTY
    } else {
        base_difficulty
    }
}

pub fn current_encounter(seed: felt252, level: u8, encounter_index: u8) -> CurrentEncounter {
    let source = if encounter_index == 0 {
        SOURCE_FIXED
    } else if is_boss_level(level) && encounter_index == ENCOUNTERS_PER_LEVEL - 1 {
        SOURCE_BOSS
    } else {
        SOURCE_RANDOM
    };
    let encounter_id = if source == SOURCE_FIXED {
        fixed_encounter_id(level)
    } else if source == SOURCE_BOSS {
        boss_encounter_id(level)
    } else {
        random_encounter_for(seed, level, encounter_index)
    };
    let difficulty_kind = encounter_difficulty(encounter_id);
    CurrentEncounter {
        level,
        encounter_index,
        encounter_id,
        source,
        category: encounter_category(encounter_id),
        difficulty_kind,
        base_difficulty: difficulty_value(level, difficulty_kind),
    }
}

pub fn effective_stat(character: @Character, stat: u8) -> u16 {
    items::effective_stat(character, stat)
}

pub fn stat_strain(character: @Character, stat: u8) -> u8 {
    if stat == STAT_STRENGTH {
        *character.strength_strain
    } else if stat == STAT_INTELLECT {
        *character.intellect_strain
    } else if stat == STAT_AGILITY {
        *character.agility_strain
    } else if stat == STAT_SPIRIT {
        *character.spirit_strain
    } else {
        0
    }
}

fn strain_difficulty_amount(strain: u8) -> u16 {
    let strain_value: u16 = strain.into();
    strain_value * STRAIN_DIFFICULTY_PER_POINT
}

pub fn boss_support_required(level: u8) -> u16 {
    let level_value: u16 = level.into();
    (level_value / 3) + 1
}

fn update_highest_pair(value: u16, highest: u16, second: u16) -> (u16, u16) {
    if value > highest {
        (value, highest)
    } else if value > second {
        (highest, value)
    } else {
        (highest, second)
    }
}

pub fn second_highest_effective_stat(character: @Character) -> u16 {
    let strength = effective_stat(character, STAT_STRENGTH);
    let intellect = effective_stat(character, STAT_INTELLECT);
    let agility = effective_stat(character, STAT_AGILITY);
    let spirit = effective_stat(character, STAT_SPIRIT);

    let (highest, second) = update_highest_pair(strength, 0, 0);
    let (highest, second) = update_highest_pair(intellect, highest, second);
    let (highest, second) = update_highest_pair(agility, highest, second);
    let (_, second) = update_highest_pair(spirit, highest, second);
    second
}

fn boss_support_difficulty_amount(boss_encounter: bool, support: u16, required: u16) -> u16 {
    if boss_encounter && support < required {
        BOSS_SUPPORT_DIFFICULTY_PENALTY
    } else {
        0
    }
}

fn boss_support_damage_amount(boss_encounter: bool, support: u16, required: u16) -> u16 {
    if boss_encounter && support < required {
        BOSS_SUPPORT_DAMAGE_PENALTY
    } else {
        0
    }
}

pub fn failure_damage_for_choice(
    boss_encounter: bool, strain_before: u8, approach: u8, boss_support_damage: u16,
) -> u16 {
    let mut damage = if boss_encounter {
        BOSS_FAILURE_DAMAGE
    } else {
        NORMAL_FAILURE_DAMAGE
    };

    if approach == APPROACH_STRAINED {
        damage += STRAINED_APPROACH_FAILURE_DAMAGE;
    }
    if strain_before >= HIGH_STRAIN_DAMAGE_THRESHOLD {
        damage += HIGH_STRAIN_FAILURE_DAMAGE;
    }

    damage + boss_support_damage
}

fn apply_skill_difficulty(base: u16, skill_id: u16) -> u16 {
    let penalty = skill_difficulty_penalty(skill_id);
    let reduction = skill_difficulty_reduction(skill_id);
    let with_penalty = base + penalty;
    if reduction >= with_penalty {
        1
    } else {
        let reduced = with_penalty - reduction;
        if reduced == 0 {
            1
        } else {
            reduced
        }
    }
}

fn apply_skill_failure_damage(base: u16, skill_id: u16) -> u16 {
    let penalty = skill_failure_damage_penalty(skill_id);
    let reduction = skill_failure_damage_reduction(skill_id);
    let with_penalty = base + penalty;
    if reduction >= with_penalty {
        0
    } else {
        with_penalty - reduction
    }
}

fn decay_strain(value: u8) -> u8 {
    if value > 0 {
        value - 1
    } else {
        0
    }
}

fn increase_strain(value: u8) -> u8 {
    if value >= MAX_STRAIN {
        MAX_STRAIN
    } else {
        value + 1
    }
}

fn favored_success_recovery(value: u8, success: bool, approach: u8) -> u8 {
    if success && approach == APPROACH_FAVORED && value > 0 {
        value - 1
    } else {
        value
    }
}

pub fn apply_choice_strain(
    mut character: Character, stat: u8, success: bool, approach: u8,
) -> Character {
    let mut strength = if stat == STAT_STRENGTH {
        increase_strain(character.strength_strain)
    } else {
        decay_strain(character.strength_strain)
    };
    let mut intellect = if stat == STAT_INTELLECT {
        increase_strain(character.intellect_strain)
    } else {
        decay_strain(character.intellect_strain)
    };
    let mut agility = if stat == STAT_AGILITY {
        increase_strain(character.agility_strain)
    } else {
        decay_strain(character.agility_strain)
    };
    let mut spirit = if stat == STAT_SPIRIT {
        increase_strain(character.spirit_strain)
    } else {
        decay_strain(character.spirit_strain)
    };

    if stat == STAT_STRENGTH {
        strength = favored_success_recovery(strength, success, approach);
    } else if stat == STAT_INTELLECT {
        intellect = favored_success_recovery(intellect, success, approach);
    } else if stat == STAT_AGILITY {
        agility = favored_success_recovery(agility, success, approach);
    } else if stat == STAT_SPIRIT {
        spirit = favored_success_recovery(spirit, success, approach);
    }

    character.strength_strain = strength;
    character.intellect_strain = intellect;
    character.agility_strain = agility;
    character.spirit_strain = spirit;
    character
}

pub fn forecast_skill(run: @Run, character: @Character, skill_id: u16) -> ChoiceForecast {
    let stat = skill_stat(skill_id);
    let encounter = current_encounter(*run.seed, *run.level, *run.encounter_index);
    let approach = option_approach(encounter.encounter_id, stat);
    let strain_before = stat_strain(character, stat);
    let strain_difficulty = strain_difficulty_amount(strain_before);
    let boss_encounter = encounter.source == SOURCE_BOSS || encounter.difficulty_kind == DIFFICULTY_BOSS;
    let support_required = if boss_encounter {
        boss_support_required(*run.level)
    } else {
        0
    };
    let support_value = if boss_encounter {
        second_highest_effective_stat(character)
    } else {
        0
    };
    let boss_support_difficulty = boss_support_difficulty_amount(
        boss_encounter, support_value, support_required,
    );
    let boss_support_damage = boss_support_damage_amount(
        boss_encounter, support_value, support_required,
    );
    let raw_difficulty = option_difficulty(encounter.base_difficulty, approach)
        + strain_difficulty
        + boss_support_difficulty;
    let difficulty = apply_skill_difficulty(raw_difficulty, skill_id);
    let effective = effective_stat(character, stat);
    let success = effective >= difficulty;
    let raw_health_loss_on_failure = failure_damage_for_choice(
        boss_encounter, strain_before, approach, boss_support_damage,
    );
    let health_loss_on_failure = apply_skill_failure_damage(raw_health_loss_on_failure, skill_id);
    let would_lose_on_failure = *character.health <= health_loss_on_failure;
    let completed_level_on_success = is_final_encounter(*run.encounter_index);

    ChoiceForecast {
        skill_id,
        stat,
        effective_stat: effective,
        base_difficulty: encounter.base_difficulty,
        difficulty,
        difficulty_modifier_sign: modifier_sign(approach),
        difficulty_modifier_amount: modifier_amount(approach),
        approach,
        success,
        boss_encounter,
        health_loss_on_failure,
        would_lose_on_failure,
        boss_retries_on_failure: boss_encounter && !would_lose_on_failure,
        completed_level_on_success,
        opens_reward_on_success: completed_level_on_success && *run.level < MAX_LEVEL,
        wins_on_success: completed_level_on_success && *run.level >= MAX_LEVEL,
        strain_before,
        strain_difficulty_amount: strain_difficulty,
        boss_support_required: support_required,
        boss_support_value: support_value,
        boss_support_difficulty_amount: boss_support_difficulty,
        boss_support_damage_amount: boss_support_damage,
    }
}

#[cfg(test)]
mod tests {
    use crate::content::data::{
        APPROACH_FAVORED, APPROACH_STANDARD, APPROACH_STRAINED, DIFFICULTY_NORMAL, STAT_STRENGTH,
    };
    use crate::helpers::encounters::{
        apply_choice_strain, boss_support_required, current_encounter, difficulty_value,
        failure_damage_for_choice, option_difficulty, second_highest_effective_stat,
    };
    use crate::models::run::CharacterTrait;

    #[test]
    fn test_level_one_fixed_encounter() {
        let encounter = current_encounter(123, 1, 0);

        assert_eq!(encounter.encounter_id, 1);
        assert_eq!(encounter.difficulty_kind, DIFFICULTY_NORMAL);
        assert_eq!(encounter.base_difficulty, 2);
    }

    #[test]
    fn test_strained_option_adds_three_difficulty() {
        assert_eq!(option_difficulty(4, APPROACH_STRAINED), 7);
    }

    #[test]
    fn test_boss_difficulty_uses_level_offset() {
        assert_eq!(difficulty_value(5, 2), 9);
    }

    #[test]
    fn test_strain_updates_chosen_and_unused_stats() {
        let mut character = CharacterTrait::new(1, 0);
        character.strength_strain = 1;
        character.intellect_strain = 2;
        character.agility_strain = 0;

        let updated = apply_choice_strain(character, STAT_STRENGTH, false, APPROACH_STANDARD);

        assert_eq!(updated.strength_strain, 2);
        assert_eq!(updated.intellect_strain, 1);
        assert_eq!(updated.agility_strain, 0);
    }

    #[test]
    fn test_favored_success_recovers_chosen_strain() {
        let mut character = CharacterTrait::new(1, 0);
        character.strength_strain = 2;

        let updated = apply_choice_strain(character, STAT_STRENGTH, true, APPROACH_FAVORED);

        assert_eq!(updated.strength_strain, 2);
    }

    #[test]
    fn test_failure_damage_adds_strain_and_approach_pressure() {
        assert_eq!(failure_damage_for_choice(false, 3, APPROACH_STRAINED, 0), 3);
        assert_eq!(failure_damage_for_choice(true, 3, APPROACH_STRAINED, 1), 5);
    }

    #[test]
    fn test_boss_support_uses_second_highest_effective_stat() {
        let mut character = CharacterTrait::new(1, 0);
        character.strength = 9;
        character.intellect = 4;
        character.agility = 6;

        assert_eq!(second_highest_effective_stat(@character), 6);
        assert_eq!(boss_support_required(15), 6);
        assert_eq!(boss_support_required(20), 7);
    }
}
