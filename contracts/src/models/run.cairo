use starknet::ContractAddress;
use crate::constants::{
    PHASE_ENCOUNTER, STARTING_HEALTH, STARTING_STAT, STARTING_XP, STARTING_XP_LEVEL,
    STATUS_PLAYING,
};
use crate::content::data::{class_second_starting_skill, class_starting_skill};
pub use crate::models::index::{Character, Run};

pub mod Errors {
    pub const NOT_FOUND: felt252 = 'Run: not found';
    pub const NOT_OWNER: felt252 = 'Run: not owner';
}

fn skill_mask(skill_id: u16) -> u64 {
    let mut mask: u64 = 1;
    let mut cursor: u16 = 1;
    while cursor < skill_id {
        mask *= 2;
        cursor += 1;
    }
    mask
}

#[generate_trait]
pub impl RunImpl of RunTrait {
    fn new(id: felt252, player: ContractAddress, seed: felt252, nonce: u32) -> Run {
        Run {
            id,
            player,
            seed,
            nonce,
            status: STATUS_PLAYING,
            phase: PHASE_ENCOUNTER,
            pending_phase: PHASE_ENCOUNTER,
            level: 1,
            encounter_index: 0,
            choice_count: 0,
            reward_count: 0,
            started_at: starknet::get_block_timestamp(),
            ended_at: 0,
        }
    }

    fn exists(self: @Run) -> bool {
        *self.started_at != 0
    }

    fn assert_exists(self: @Run) {
        assert(self.exists(), Errors::NOT_FOUND);
    }

    fn assert_owner(self: @Run, caller: ContractAddress) {
        assert(*self.player == caller, Errors::NOT_OWNER);
    }
}

#[generate_trait]
pub impl CharacterImpl of CharacterTrait {
    fn new(run_id: felt252, class_id: u8) -> Character {
        let mut unlocked_skills_bits: u64 = 0;
        let starting_skill = class_starting_skill(class_id);
        if starting_skill > 0 {
            unlocked_skills_bits += skill_mask(starting_skill);
        }
        let second_starting_skill = class_second_starting_skill(class_id);
        if second_starting_skill > 0 {
            unlocked_skills_bits += skill_mask(second_starting_skill);
        }

        Character {
            run_id,
            class_id,
            health: STARTING_HEALTH,
            max_health: STARTING_HEALTH,
            xp_level: STARTING_XP_LEVEL,
            xp: STARTING_XP,
            skill_points: 0,
            stat_points: 0,
            unlocked_skills_bits,
            strength: STARTING_STAT,
            intellect: STARTING_STAT,
            agility: STARTING_STAT,
            spirit: STARTING_STAT,
            strength_strain: 0,
            intellect_strain: 0,
            agility_strain: 0,
            spirit_strain: 0,
            weapon_item_id: 0,
            armor_item_id: 0,
            trinket_item_id: 0,
            inventory_bits: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::constants::{STARTING_HEALTH, STARTING_STAT, STARTING_XP, STARTING_XP_LEVEL};
    use crate::models::run::CharacterTrait;

    #[test]
    fn test_initial_character_values() {
        let character = CharacterTrait::new(123, 0);

        assert_eq!(character.run_id, 123);
        assert_eq!(character.class_id, 0);
        assert_eq!(character.health, STARTING_HEALTH);
        assert_eq!(character.max_health, STARTING_HEALTH);
        assert_eq!(character.xp_level, STARTING_XP_LEVEL);
        assert_eq!(character.xp, STARTING_XP);
        assert_eq!(character.skill_points, 0);
        assert_eq!(character.stat_points, 0);
        assert_eq!(character.unlocked_skills_bits, 3);
        assert_eq!(character.strength, STARTING_STAT);
        assert_eq!(character.intellect, STARTING_STAT);
        assert_eq!(character.agility, STARTING_STAT);
        assert_eq!(character.spirit, STARTING_STAT);
        assert_eq!(character.strength_strain, 0);
        assert_eq!(character.intellect_strain, 0);
        assert_eq!(character.agility_strain, 0);
        assert_eq!(character.spirit_strain, 0);
        assert_eq!(character.weapon_item_id, 0);
        assert_eq!(character.armor_item_id, 0);
        assert_eq!(character.trinket_item_id, 0);
        assert_eq!(character.inventory_bits, 0);
    }

    #[test]
    fn test_every_class_starts_with_two_skills() {
        let vanguard = CharacterTrait::new(1, 0);
        let scholar = CharacterTrait::new(2, 1);
        let shade = CharacterTrait::new(3, 2);
        let oracle = CharacterTrait::new(4, 3);

        assert_eq!(vanguard.unlocked_skills_bits, 3);
        assert_eq!(scholar.unlocked_skills_bits, 48);
        assert_eq!(shade.unlocked_skills_bits, 768);
        assert_eq!(oracle.unlocked_skills_bits, 12288);
    }
}
