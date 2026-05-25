pub const MAX_LEVEL: u8 = 20;
pub const ENCOUNTERS_PER_LEVEL: u8 = 3;
pub const STARTING_HEALTH: u16 = 10;
pub const STARTING_STAT: u16 = 2;
pub const STARTING_XP_LEVEL: u16 = 1;
pub const STARTING_XP: u16 = 0;

pub const NORMAL_DIFFICULTY_OFFSET: u16 = 1;
pub const HARD_DIFFICULTY_OFFSET: u16 = 3;
pub const BOSS_DIFFICULTY_OFFSET: u16 = 4;

pub const NORMAL_FAILURE_DAMAGE: u16 = 1;
pub const BOSS_FAILURE_DAMAGE: u16 = 2;
pub const BOSS_VICTORY_HEAL: u16 = 2;

pub const MAX_STRAIN: u8 = 3;
pub const STRAIN_DIFFICULTY_PER_POINT: u16 = 1;
pub const STRAINED_APPROACH_DIFFICULTY: u16 = 3;
pub const STRAINED_APPROACH_FAILURE_DAMAGE: u16 = 1;
pub const HIGH_STRAIN_DAMAGE_THRESHOLD: u8 = 3;
pub const HIGH_STRAIN_FAILURE_DAMAGE: u16 = 1;
pub const BOSS_SUPPORT_DIFFICULTY_PENALTY: u16 = 2;
pub const BOSS_SUPPORT_DAMAGE_PENALTY: u16 = 1;

pub const NORMAL_ENCOUNTER_XP_BASE: u16 = 5;
pub const BOSS_ENCOUNTER_XP_BASE: u16 = 10;
pub const BOSS_ENCOUNTER_XP_LEVEL_MULTIPLIER: u16 = 2;
pub const XP_BASE_REQUIRED: u16 = 8;
pub const XP_REQUIRED_PER_LEVEL: u16 = 3;
pub const SKILL_POINTS_PER_XP_LEVEL: u16 = 1;
pub const STAT_POINTS_PER_XP_LEVEL: u16 = 1;

pub const STATUS_NOT_STARTED: u8 = 0;
pub const STATUS_PLAYING: u8 = 1;
pub const STATUS_REWARD: u8 = 2;
pub const STATUS_WON: u8 = 3;
pub const STATUS_LOST: u8 = 4;

pub const PHASE_ENCOUNTER: u8 = 0;
pub const PHASE_REWARD: u8 = 1;
pub const PHASE_COMPLETE: u8 = 2;
pub const PHASE_SKILL_UNLOCK: u8 = 3;
pub const PHASE_GROWTH: u8 = 3;

pub const SOURCE_FIXED: u8 = 0;
pub const SOURCE_RANDOM: u8 = 1;
pub const SOURCE_BOSS: u8 = 2;

pub const REWARD_REASON_STRONGEST_STAT: u8 = 0;
pub const REWARD_REASON_RANDOM: u8 = 1;
pub const REWARD_REASON_MIXED: u8 = 2;
pub const REWARD_CHOICES_PER_LEVEL: u8 = 3;
pub const BOSS_REWARD_TIER_BONUS: u8 = 1;

pub const SIGN_ZERO: u8 = 0;
pub const SIGN_POSITIVE: u8 = 1;
pub const SIGN_NEGATIVE: u8 = 2;

// Keep this in sync with dojo_*.toml.
pub fn DEFAULT_NS() -> ByteArray {
    "gravenhold"
}
