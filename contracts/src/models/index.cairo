use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Run {
    #[key]
    pub id: felt252,
    pub player: ContractAddress,
    pub seed: felt252,
    pub nonce: u32,
    pub status: u8,
    pub phase: u8,
    pub pending_phase: u8,
    pub level: u8,
    pub encounter_index: u8,
    pub choice_count: u16,
    pub reward_count: u16,
    pub started_at: u64,
    pub ended_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Character {
    #[key]
    pub run_id: felt252,
    pub health: u16,
    pub max_health: u16,
    pub xp_level: u16,
    pub xp: u16,
    pub unspent_stat_points: u16,
    pub strength: u16,
    pub intellect: u16,
    pub agility: u16,
    pub spirit: u16,
    pub strength_strain: u8,
    pub intellect_strain: u8,
    pub agility_strain: u8,
    pub spirit_strain: u8,
    pub weapon_item_id: u16,
    pub armor_item_id: u16,
    pub trinket_item_id: u16,
    pub inventory_bits: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ActiveRun {
    #[key]
    pub player: ContractAddress,
    pub run_id: felt252,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerRunCounter {
    #[key]
    pub player: ContractAddress,
    pub next_nonce: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ChoiceLog {
    #[key]
    pub run_id: felt252,
    #[key]
    pub index: u16,
    pub level: u8,
    pub encounter_index: u8,
    pub encounter_id: u16,
    pub stat: u8,
    pub success: bool,
    pub effective_stat: u16,
    pub base_difficulty: u16,
    pub difficulty: u16,
    pub difficulty_modifier_sign: u8,
    pub difficulty_modifier_amount: u16,
    pub health_delta_sign: u8,
    pub health_delta_amount: u16,
    pub xp_gain: u16,
    pub xp_level_after: u16,
    pub leveled_up: bool,
    pub boss_encounter: bool,
    pub boss_defeated: bool,
    pub completed_level: bool,
    pub game_ended: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct RewardOffer {
    #[key]
    pub run_id: felt252,
    #[key]
    pub index: u8,
    pub level: u8,
    pub item_id: u16,
    pub reason: u8,
    pub tier: u8,
    pub active: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct RewardLog {
    #[key]
    pub run_id: felt252,
    #[key]
    pub index: u16,
    pub level: u8,
    pub item_id: u16,
    pub equipped: bool,
}

#[derive(Copy, Drop, Serde)]
pub struct CurrentEncounter {
    pub level: u8,
    pub encounter_index: u8,
    pub encounter_id: u16,
    pub source: u8,
    pub category: u8,
    pub difficulty_kind: u8,
    pub base_difficulty: u16,
}

#[derive(Copy, Drop, Serde)]
pub struct ChoiceForecast {
    pub stat: u8,
    pub effective_stat: u16,
    pub base_difficulty: u16,
    pub difficulty: u16,
    pub difficulty_modifier_sign: u8,
    pub difficulty_modifier_amount: u16,
    pub approach: u8,
    pub success: bool,
    pub boss_encounter: bool,
    pub health_loss_on_failure: u16,
    pub would_lose_on_failure: bool,
    pub boss_retries_on_failure: bool,
    pub completed_level_on_success: bool,
    pub opens_reward_on_success: bool,
    pub wins_on_success: bool,
    pub strain_before: u8,
    pub strain_difficulty_amount: u16,
    pub boss_support_required: u16,
    pub boss_support_value: u16,
    pub boss_support_difficulty_amount: u16,
    pub boss_support_damage_amount: u16,
}

#[derive(Copy, Drop, Serde)]
pub struct EquipmentView {
    pub weapon_item_id: u16,
    pub armor_item_id: u16,
    pub trinket_item_id: u16,
}

#[derive(Copy, Drop, Serde)]
pub struct ItemView {
    pub item_id: u16,
    pub exists: bool,
    pub slot: u8,
    pub tier: u8,
    pub strength_bonus: u16,
    pub intellect_bonus: u16,
    pub agility_bonus: u16,
    pub spirit_bonus: u16,
}
