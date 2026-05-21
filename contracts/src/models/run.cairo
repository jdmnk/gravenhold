use starknet::ContractAddress;
use crate::constants::{
    PHASE_ENCOUNTER, STARTING_HEALTH, STARTING_STAT, STARTING_XP, STARTING_XP_LEVEL,
    STATUS_PLAYING,
};
pub use crate::models::index::{Character, Run};

pub mod Errors {
    pub const NOT_FOUND: felt252 = 'Run: not found';
    pub const NOT_OWNER: felt252 = 'Run: not owner';
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
    fn new(run_id: felt252) -> Character {
        Character {
            run_id,
            health: STARTING_HEALTH,
            max_health: STARTING_HEALTH,
            xp_level: STARTING_XP_LEVEL,
            xp: STARTING_XP,
            unspent_stat_points: 0,
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
        let character = CharacterTrait::new(123);

        assert_eq!(character.run_id, 123);
        assert_eq!(character.health, STARTING_HEALTH);
        assert_eq!(character.max_health, STARTING_HEALTH);
        assert_eq!(character.xp_level, STARTING_XP_LEVEL);
        assert_eq!(character.xp, STARTING_XP);
        assert_eq!(character.unspent_stat_points, 0);
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
}
