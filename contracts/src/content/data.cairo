// Cairo-owned RPG content.
// TypeScript may generate display text keyed by these IDs, but must not generate
// or mirror these rule-bearing values.

pub const RANDOM_ENCOUNTER_COUNT: u8 = 30;
pub const ITEM_COUNT: u16 = 40;

pub const STAT_STRENGTH: u8 = 0;
pub const STAT_INTELLECT: u8 = 1;
pub const STAT_AGILITY: u8 = 2;
pub const STAT_SPIRIT: u8 = 3;

pub const CATEGORY_OBSTACLE: u8 = 0;
pub const CATEGORY_ENEMY: u8 = 1;
pub const CATEGORY_SOCIAL: u8 = 2;
pub const CATEGORY_MYSTERY: u8 = 3;
pub const CATEGORY_SURVIVAL: u8 = 4;
pub const CATEGORY_BOSS: u8 = 5;

pub const DIFFICULTY_NORMAL: u8 = 0;
pub const DIFFICULTY_HARD: u8 = 1;
pub const DIFFICULTY_BOSS: u8 = 2;

pub const APPROACH_FAVORED: u8 = 0;
pub const APPROACH_STANDARD: u8 = 1;
pub const APPROACH_STRAINED: u8 = 2;

pub const SLOT_WEAPON: u8 = 0;
pub const SLOT_ARMOR: u8 = 1;
pub const SLOT_TRINKET: u8 = 2;

pub fn fixed_encounter_id(level: u8) -> u16 {
    match level {
        1 => 1,
        2 => 2,
        3 => 3,
        4 => 4,
        5 => 5,
        6 => 6,
        7 => 7,
        8 => 8,
        9 => 9,
        10 => 10,
        11 => 11,
        12 => 12,
        13 => 13,
        14 => 14,
        15 => 15,
        16 => 16,
        17 => 17,
        18 => 18,
        19 => 19,
        20 => 20,
        _ => 0,
    }
}

pub fn random_encounter_id(index: u8) -> u16 {
    match index {
        0 => 101,
        1 => 102,
        2 => 103,
        3 => 104,
        4 => 105,
        5 => 106,
        6 => 107,
        7 => 108,
        8 => 109,
        9 => 110,
        10 => 111,
        11 => 112,
        12 => 113,
        13 => 114,
        14 => 115,
        15 => 116,
        16 => 117,
        17 => 118,
        18 => 119,
        19 => 120,
        20 => 121,
        21 => 122,
        22 => 123,
        23 => 124,
        24 => 125,
        25 => 126,
        26 => 127,
        27 => 128,
        28 => 129,
        29 => 130,
        _ => 0,
    }
}

pub fn boss_encounter_id(level: u8) -> u16 {
    match level {
        5 => 201,
        10 => 202,
        15 => 203,
        20 => 204,
        _ => 0,
    }
}

pub fn encounter_category(encounter_id: u16) -> u8 {
    match encounter_id {
        1 => 0,
        2 => 4,
        3 => 2,
        4 => 3,
        5 => 1,
        6 => 0,
        7 => 3,
        8 => 4,
        9 => 2,
        10 => 1,
        11 => 0,
        12 => 3,
        13 => 4,
        14 => 2,
        15 => 1,
        16 => 0,
        17 => 3,
        18 => 4,
        19 => 2,
        20 => 1,
        101 => 1,
        102 => 0,
        103 => 3,
        104 => 4,
        105 => 2,
        106 => 0,
        107 => 1,
        108 => 3,
        109 => 4,
        110 => 2,
        111 => 1,
        112 => 1,
        113 => 1,
        114 => 1,
        115 => 0,
        116 => 0,
        117 => 0,
        118 => 0,
        119 => 3,
        120 => 3,
        121 => 3,
        122 => 3,
        123 => 4,
        124 => 4,
        125 => 4,
        126 => 4,
        127 => 2,
        128 => 2,
        129 => 2,
        130 => 2,
        201 => 5,
        202 => 5,
        203 => 5,
        204 => 5,
        _ => 0,
    }
}

pub fn encounter_difficulty(encounter_id: u16) -> u8 {
    match encounter_id {
        1 => 0,
        2 => 0,
        3 => 0,
        4 => 0,
        5 => 1,
        6 => 0,
        7 => 0,
        8 => 0,
        9 => 1,
        10 => 1,
        11 => 0,
        12 => 1,
        13 => 1,
        14 => 1,
        15 => 1,
        16 => 1,
        17 => 1,
        18 => 1,
        19 => 1,
        20 => 1,
        101 => 0,
        102 => 0,
        103 => 0,
        104 => 0,
        105 => 0,
        106 => 0,
        107 => 0,
        108 => 0,
        109 => 0,
        110 => 0,
        111 => 0,
        112 => 0,
        113 => 0,
        114 => 0,
        115 => 0,
        116 => 0,
        117 => 0,
        118 => 0,
        119 => 0,
        120 => 0,
        121 => 0,
        122 => 0,
        123 => 0,
        124 => 0,
        125 => 0,
        126 => 0,
        127 => 0,
        128 => 0,
        129 => 0,
        130 => 0,
        201 => 2,
        202 => 2,
        203 => 2,
        204 => 2,
        _ => 0,
    }
}

pub fn option_approach(encounter_id: u16, stat: u8) -> u8 {
    if encounter_id == 1 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 2 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 3 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 4 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 5 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 6 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 7 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 8 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 9 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 10 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 11 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 12 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 13 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 14 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 15 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 16 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 17 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 18 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 19 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 20 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 101 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 102 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 103 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 104 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 105 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 106 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 107 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 108 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 109 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 110 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 111 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 112 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 113 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 114 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 115 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 116 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 117 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 118 {
        if stat == 0 { return APPROACH_FAVORED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STRAINED; }
    }
    if encounter_id == 119 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 120 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 121 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 122 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 123 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 124 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 125 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 126 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STRAINED; }
        if stat == 2 { return APPROACH_FAVORED; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 127 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 128 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STRAINED; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 129 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_FAVORED; }
    }
    if encounter_id == 130 {
        if stat == 0 { return APPROACH_STRAINED; }
        if stat == 1 { return APPROACH_FAVORED; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 201 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 202 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 203 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    if encounter_id == 204 {
        if stat == 0 { return APPROACH_STANDARD; }
        if stat == 1 { return APPROACH_STANDARD; }
        if stat == 2 { return APPROACH_STANDARD; }
        if stat == 3 { return APPROACH_STANDARD; }
    }
    APPROACH_STANDARD
}

pub fn item_slot(item_id: u16) -> u8 {
    match item_id {
        1 => 0,
        2 => 2,
        3 => 1,
        4 => 2,
        5 => 1,
        6 => 2,
        7 => 0,
        8 => 2,
        9 => 1,
        10 => 2,
        11 => 1,
        12 => 2,
        13 => 0,
        14 => 2,
        15 => 1,
        16 => 2,
        17 => 0,
        18 => 2,
        19 => 0,
        20 => 2,
        21 => 1,
        22 => 2,
        23 => 0,
        24 => 1,
        25 => 1,
        26 => 0,
        27 => 0,
        28 => 1,
        29 => 1,
        30 => 0,
        31 => 0,
        32 => 1,
        33 => 1,
        34 => 0,
        35 => 0,
        36 => 1,
        37 => 1,
        38 => 0,
        39 => 0,
        40 => 1,
        _ => 0,
    }
}

pub fn item_tier(item_id: u16) -> u8 {
    match item_id {
        1 => 1,
        2 => 1,
        3 => 1,
        4 => 1,
        5 => 1,
        6 => 1,
        7 => 2,
        8 => 2,
        9 => 2,
        10 => 2,
        11 => 2,
        12 => 2,
        13 => 3,
        14 => 3,
        15 => 3,
        16 => 3,
        17 => 3,
        18 => 3,
        19 => 4,
        20 => 4,
        21 => 4,
        22 => 4,
        23 => 4,
        24 => 4,
        25 => 1,
        26 => 1,
        27 => 1,
        28 => 1,
        29 => 2,
        30 => 2,
        31 => 2,
        32 => 2,
        33 => 3,
        34 => 3,
        35 => 3,
        36 => 3,
        37 => 4,
        38 => 4,
        39 => 4,
        40 => 4,
        _ => 0,
    }
}

pub fn item_bonus(item_id: u16, stat: u8) -> u16 {
    if item_id == 1 {
        if stat == 0 { return 1; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 2 {
        if stat == 0 { return 0; }
        if stat == 1 { return 1; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 3 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 1; }
        if stat == 3 { return 0; }
    }
    if item_id == 4 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 1; }
    }
    if item_id == 5 {
        if stat == 0 { return 0; }
        if stat == 1 { return 1; }
        if stat == 2 { return 1; }
        if stat == 3 { return 0; }
    }
    if item_id == 6 {
        if stat == 0 { return 1; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 1; }
    }
    if item_id == 7 {
        if stat == 0 { return 2; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 8 {
        if stat == 0 { return 0; }
        if stat == 1 { return 2; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 9 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 2; }
        if stat == 3 { return 0; }
    }
    if item_id == 10 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 2; }
    }
    if item_id == 11 {
        if stat == 0 { return 1; }
        if stat == 1 { return 1; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 12 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 1; }
        if stat == 3 { return 1; }
    }
    if item_id == 13 {
        if stat == 0 { return 3; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 14 {
        if stat == 0 { return 0; }
        if stat == 1 { return 3; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 15 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 3; }
        if stat == 3 { return 0; }
    }
    if item_id == 16 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 3; }
    }
    if item_id == 17 {
        if stat == 0 { return 1; }
        if stat == 1 { return 0; }
        if stat == 2 { return 2; }
        if stat == 3 { return 0; }
    }
    if item_id == 18 {
        if stat == 0 { return 0; }
        if stat == 1 { return 2; }
        if stat == 2 { return 0; }
        if stat == 3 { return 1; }
    }
    if item_id == 19 {
        if stat == 0 { return 4; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 20 {
        if stat == 0 { return 0; }
        if stat == 1 { return 4; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 21 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 4; }
        if stat == 3 { return 0; }
    }
    if item_id == 22 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 4; }
    }
    if item_id == 23 {
        if stat == 0 { return 2; }
        if stat == 1 { return 2; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 24 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 2; }
        if stat == 3 { return 2; }
    }
    if item_id == 25 {
        if stat == 0 { return 1; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 26 {
        if stat == 0 { return 0; }
        if stat == 1 { return 1; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 27 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 1; }
        if stat == 3 { return 0; }
    }
    if item_id == 28 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 1; }
    }
    if item_id == 29 {
        if stat == 0 { return 2; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 30 {
        if stat == 0 { return 0; }
        if stat == 1 { return 2; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 31 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 2; }
        if stat == 3 { return 0; }
    }
    if item_id == 32 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 2; }
    }
    if item_id == 33 {
        if stat == 0 { return 3; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 34 {
        if stat == 0 { return 0; }
        if stat == 1 { return 3; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 35 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 3; }
        if stat == 3 { return 0; }
    }
    if item_id == 36 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 3; }
    }
    if item_id == 37 {
        if stat == 0 { return 4; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 38 {
        if stat == 0 { return 0; }
        if stat == 1 { return 4; }
        if stat == 2 { return 0; }
        if stat == 3 { return 0; }
    }
    if item_id == 39 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 4; }
        if stat == 3 { return 0; }
    }
    if item_id == 40 {
        if stat == 0 { return 0; }
        if stat == 1 { return 0; }
        if stat == 2 { return 0; }
        if stat == 3 { return 4; }
    }
    0
}
