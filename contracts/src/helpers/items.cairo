use core::poseidon::poseidon_hash_span;
use crate::constants::{
    BOSS_REWARD_TIER_BONUS, REWARD_REASON_MIXED, REWARD_REASON_STRONGEST_STAT,
};
use crate::content::data::{
    ITEM_COUNT, SLOT_ARMOR, SLOT_TRINKET, SLOT_WEAPON, STAT_AGILITY, STAT_INTELLECT, STAT_SPIRIT,
    STAT_STRENGTH, item_bonus, item_slot, item_tier,
};
use crate::helpers::encounters::is_boss_level;
use crate::models::index::Character;

pub fn item_exists(item_id: u16) -> bool {
    item_id > 0 && item_id <= ITEM_COUNT
}

pub fn inventory_mask(item_id: u16) -> u64 {
    let mut mask: u64 = 1;
    let mut cursor: u16 = 1;
    while cursor < item_id {
        mask *= 2;
        cursor += 1;
    }
    mask
}

pub fn inventory_has(character: @Character, item_id: u16) -> bool {
    if !item_exists(item_id) {
        return false;
    }

    let mask = inventory_mask(item_id);
    ((*character.inventory_bits / mask) % 2) == 1
}

pub fn add_inventory(mut character: Character, item_id: u16) -> Character {
    if !inventory_has(@character, item_id) {
        character.inventory_bits += inventory_mask(item_id);
    }
    character
}

pub fn equip_owned_item(mut character: Character, item_id: u16) -> Character {
    let slot = item_slot(item_id);
    if slot == SLOT_WEAPON {
        character.weapon_item_id = item_id;
    } else if slot == SLOT_ARMOR {
        character.armor_item_id = item_id;
    } else if slot == SLOT_TRINKET {
        character.trinket_item_id = item_id;
    }
    character
}

pub fn equipment_bonus(character: @Character, stat: u8) -> u16 {
    item_bonus(*character.weapon_item_id, stat)
        + item_bonus(*character.armor_item_id, stat)
        + item_bonus(*character.trinket_item_id, stat)
}

pub fn base_stat(character: @Character, stat: u8) -> u16 {
    if stat == STAT_STRENGTH {
        *character.strength
    } else if stat == STAT_INTELLECT {
        *character.intellect
    } else if stat == STAT_AGILITY {
        *character.agility
    } else if stat == STAT_SPIRIT {
        *character.spirit
    } else {
        0
    }
}

pub fn effective_stat(character: @Character, stat: u8) -> u16 {
    base_stat(character, stat) + equipment_bonus(character, stat)
}

pub fn strongest_stat(character: @Character) -> u8 {
    let mut strongest = STAT_STRENGTH;
    let mut strongest_value = effective_stat(character, STAT_STRENGTH);

    let intellect = effective_stat(character, STAT_INTELLECT);
    if intellect > strongest_value {
        strongest = STAT_INTELLECT;
        strongest_value = intellect;
    }

    let agility = effective_stat(character, STAT_AGILITY);
    if agility > strongest_value {
        strongest = STAT_AGILITY;
        strongest_value = agility;
    }

    let spirit = effective_stat(character, STAT_SPIRIT);
    if spirit > strongest_value {
        strongest = STAT_SPIRIT;
    }

    strongest
}

pub fn item_bonus_count(item_id: u16) -> u8 {
    let mut count: u8 = 0;
    if item_bonus(item_id, STAT_STRENGTH) > 0 {
        count += 1;
    }
    if item_bonus(item_id, STAT_INTELLECT) > 0 {
        count += 1;
    }
    if item_bonus(item_id, STAT_AGILITY) > 0 {
        count += 1;
    }
    if item_bonus(item_id, STAT_SPIRIT) > 0 {
        count += 1;
    }
    count
}

pub fn reward_tier(level: u8) -> u8 {
    let act_tier = ((level - 1) / 5) + 1;
    let boss_bonus = if is_boss_level(level) {
        BOSS_REWARD_TIER_BONUS
    } else {
        0
    };
    act_tier + boss_bonus
}

fn excluded(item_id: u16, first_excluded: u16, second_excluded: u16) -> bool {
    item_id == first_excluded || item_id == second_excluded
}

fn item_matches_reason(item_id: u16, reason: u8, build_stat: u8) -> bool {
    if reason == REWARD_REASON_STRONGEST_STAT {
        item_bonus(item_id, build_stat) > 0
    } else if reason == REWARD_REASON_MIXED {
        item_bonus_count(item_id) > 1
    } else {
        true
    }
}

fn eligible(
    character: @Character,
    item_id: u16,
    tier: u8,
    reason: u8,
    build_stat: u8,
    first_excluded: u16,
    second_excluded: u16,
    enforce_reason: bool,
) -> bool {
    item_exists(item_id)
        && item_tier(item_id) <= tier
        && !inventory_has(character, item_id)
        && !excluded(item_id, first_excluded, second_excluded)
        && (!enforce_reason || item_matches_reason(item_id, reason, build_stat))
}

pub fn pick_reward_item(
    seed: felt252,
    level: u8,
    reason: u8,
    build_stat: u8,
    character: @Character,
    first_excluded: u16,
    second_excluded: u16,
) -> u16 {
    let tier = reward_tier(level);
    let mut count: u16 = 0;
    let mut item_id: u16 = 1;
    while item_id <= ITEM_COUNT {
        if eligible(character, item_id, tier, reason, build_stat, first_excluded, second_excluded, true) {
            count += 1;
        }
        item_id += 1;
    }

    let mut enforce_reason = true;
    if count == 0 {
        enforce_reason = false;
        item_id = 1;
        while item_id <= ITEM_COUNT {
            if eligible(character, item_id, tier, reason, build_stat, first_excluded, second_excluded, false) {
                count += 1;
            }
            item_id += 1;
        }
    }

    if count == 0 {
        return 1;
    }

    let raw = poseidon_hash_span([seed, level.into(), reason.into(), build_stat.into()].span());
    let raw_u256: u256 = raw.into();
    let count_u256: u256 = count.into();
    let target: u16 = (raw_u256 % count_u256).try_into().unwrap();
    let mut ordinal: u16 = 0;
    item_id = 1;
    while item_id <= ITEM_COUNT {
        if eligible(character, item_id, tier, reason, build_stat, first_excluded, second_excluded, enforce_reason) {
            if ordinal == target {
                return item_id;
            }
            ordinal += 1;
        }
        item_id += 1;
    }

    1
}

#[cfg(test)]
mod tests {
    use crate::content::data::{STAT_STRENGTH, SLOT_WEAPON, item_bonus, item_slot};
    use crate::helpers::items::{inventory_has, item_exists, reward_tier};
    use crate::models::run::CharacterTrait;

    #[test]
    fn test_generated_first_item() {
        assert(item_exists(1), 'item exists');
        assert_eq!(item_slot(1), SLOT_WEAPON);
        assert_eq!(item_bonus(1, STAT_STRENGTH), 1);
    }

    #[test]
    fn test_inventory_default_empty() {
        let character = CharacterTrait::new(1);
        assert(!inventory_has(@character, 1), 'inventory empty');
    }

    #[test]
    fn test_reward_tier_boss_bonus() {
        assert_eq!(reward_tier(1), 1);
        assert_eq!(reward_tier(5), 2);
        assert_eq!(reward_tier(20), 5);
    }
}
