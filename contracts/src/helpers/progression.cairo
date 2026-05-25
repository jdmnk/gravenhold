use crate::constants::{
    BOSS_ENCOUNTER_XP_BASE, BOSS_ENCOUNTER_XP_LEVEL_MULTIPLIER, NORMAL_ENCOUNTER_XP_BASE,
    SKILL_POINTS_PER_XP_LEVEL, STAT_POINTS_PER_XP_LEVEL, XP_BASE_REQUIRED, XP_REQUIRED_PER_LEVEL,
};
use crate::models::index::Character;

pub fn xp_for_encounter(path_level: u8, boss_encounter: bool) -> u16 {
    let level_value: u16 = path_level.into();
    if boss_encounter {
        BOSS_ENCOUNTER_XP_BASE + (level_value * BOSS_ENCOUNTER_XP_LEVEL_MULTIPLIER)
    } else {
        NORMAL_ENCOUNTER_XP_BASE + level_value
    }
}

pub fn xp_required_for_level(xp_level: u16) -> u16 {
    let soft_curve = (xp_level * xp_level) / 3;
    XP_BASE_REQUIRED + (xp_level * XP_REQUIRED_PER_LEVEL) + soft_curve
}

pub fn apply_xp(mut character: Character, xp_gain: u16) -> Character {
    character.xp += xp_gain;

    while character.xp >= xp_required_for_level(character.xp_level) {
        let required = xp_required_for_level(character.xp_level);

        character.xp -= required;
        character.xp_level += 1;
        character.stat_points += STAT_POINTS_PER_XP_LEVEL;
        if character.xp_level > 1 && character.xp_level % 2 == 1 {
            character.skill_points += SKILL_POINTS_PER_XP_LEVEL;
        }
    };

    character
}

#[cfg(test)]
mod tests {
    use crate::helpers::progression::{apply_xp, xp_for_encounter, xp_required_for_level};
    use crate::models::run::CharacterTrait;

    #[test]
    fn test_xp_requirement_increases_by_level() {
        assert_eq!(xp_required_for_level(1), 11);
        assert_eq!(xp_required_for_level(2), 15);
        assert_eq!(xp_required_for_level(5), 31);
    }

    #[test]
    fn test_encounter_xp_scales_with_path_level_and_bosses() {
        assert_eq!(xp_for_encounter(1, false), 6);
        assert_eq!(xp_for_encounter(5, false), 10);
        assert_eq!(xp_for_encounter(5, true), 20);
    }

    #[test]
    fn test_apply_xp_grants_stat_point_on_every_level_up() {
        let character = CharacterTrait::new(1, 0);
        let updated = apply_xp(character, 12);

        assert_eq!(updated.xp_level, 2);
        assert_eq!(updated.xp, 1);
        assert_eq!(updated.stat_points, 1);
        assert_eq!(updated.skill_points, 0);
    }

    #[test]
    fn test_apply_xp_grants_skill_point_on_odd_level_after_one() {
        let character = CharacterTrait::new(1, 0);
        let updated = apply_xp(character, 27);

        assert_eq!(updated.xp_level, 3);
        assert_eq!(updated.xp, 1);
        assert_eq!(updated.stat_points, 2);
        assert_eq!(updated.skill_points, 1);
    }
}
