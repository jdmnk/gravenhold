import type { StatId } from "@/lib/chain/state";

export const classIds = ["vanguard", "scholar", "shade", "oracle"] as const;
export type ClassId = (typeof classIds)[number];

export type SkillId =
  | "force_entry"
  | "brace"
  | "shield_break"
  | "last_stand"
  | "study_weakness"
  | "warded_plan"
  | "exploit_pattern"
  | "perfect_theorem"
  | "shadow_step"
  | "misdirect"
  | "knife_window"
  | "vanish"
  | "steady_heart"
  | "mend_will"
  | "spirit_breach"
  | "oracle_oath";

export type ClassText = {
  description: string;
  id: ClassId;
  label: string;
  stat: StatId;
};

export type SkillText = {
  bridgeStat?: StatId;
  classId: ClassId;
  description: string;
  id: SkillId;
  label: string;
  requiredStats?: Partial<Record<StatId, number>>;
  stat: StatId;
  tier: number;
};

export const classText: Record<ClassId, ClassText> = {
  oracle: {
    description: "Outlasts the road through resolve, recovery, and mystic resistance.",
    id: "oracle",
    label: "Oracle",
    stat: "spirit",
  },
  scholar: {
    description: "Turns danger into a problem to read, prepare for, and exploit.",
    id: "scholar",
    label: "Scholar",
    stat: "intellect",
  },
  shade: {
    description: "Survives through speed, precision, misdirection, and clean exits.",
    id: "shade",
    label: "Shade",
    stat: "agility",
  },
  vanguard: {
    description: "Breaks the path open with force, armor, and stubborn momentum.",
    id: "vanguard",
    label: "Vanguard",
    stat: "strength",
  },
};

export const skillText: Record<SkillId, SkillText> = {
  brace: {
    classId: "vanguard",
    description: "Take the harder angle, but blunt the cost if it fails.",
    id: "brace",
    label: "Brace",
    requiredStats: { strength: 4 },
    stat: "strength",
    tier: 1,
  },
  exploit_pattern: {
    classId: "scholar",
    description: "Convert a read on the encounter into a cleaner check.",
    id: "exploit_pattern",
    label: "Exploit Pattern",
    requiredStats: { intellect: 5 },
    stat: "intellect",
    tier: 2,
  },
  force_entry: {
    classId: "vanguard",
    description: "Meet the obstacle directly and force a path forward.",
    id: "force_entry",
    label: "Force Entry",
    stat: "strength",
    tier: 0,
  },
  knife_window: {
    classId: "shade",
    description: "Find the brief opening where speed matters more than safety.",
    id: "knife_window",
    label: "Knife Window",
    requiredStats: { agility: 5 },
    stat: "agility",
    tier: 2,
  },
  last_stand: {
    classId: "vanguard",
    description: "Commit everything to the push. Stronger check, harsher miss.",
    bridgeStat: "spirit",
    id: "last_stand",
    label: "Last Stand",
    requiredStats: { spirit: 3, strength: 4 },
    stat: "strength",
    tier: 3,
  },
  mend_will: {
    classId: "oracle",
    description: "Choose the slower route and reduce the harm of failure.",
    id: "mend_will",
    label: "Mend Will",
    requiredStats: { spirit: 4 },
    stat: "spirit",
    tier: 1,
  },
  misdirect: {
    classId: "shade",
    description: "A safer feint that gives ground before slipping through.",
    id: "misdirect",
    label: "Misdirect",
    requiredStats: { agility: 4 },
    stat: "agility",
    tier: 1,
  },
  oracle_oath: {
    classId: "oracle",
    description: "Commit to the vision. Easier check, but costly if broken.",
    bridgeStat: "strength",
    id: "oracle_oath",
    label: "Oracle Oath",
    requiredStats: { spirit: 4, strength: 3 },
    stat: "spirit",
    tier: 3,
  },
  perfect_theorem: {
    classId: "scholar",
    description: "Risk everything on a complete solution to the encounter.",
    bridgeStat: "agility",
    id: "perfect_theorem",
    label: "Perfect Theorem",
    requiredStats: { agility: 3, intellect: 4 },
    stat: "intellect",
    tier: 3,
  },
  shadow_step: {
    classId: "shade",
    description: "Move first, stay light, and pass before danger settles.",
    id: "shadow_step",
    label: "Shadow Step",
    stat: "agility",
    tier: 0,
  },
  shield_break: {
    classId: "vanguard",
    description: "Drive into the weakest point and lower the check.",
    id: "shield_break",
    label: "Shield Break",
    requiredStats: { strength: 5 },
    stat: "strength",
    tier: 2,
  },
  spirit_breach: {
    classId: "oracle",
    description: "Lean into the unseen pressure and make it yield.",
    id: "spirit_breach",
    label: "Spirit Breach",
    requiredStats: { spirit: 5 },
    stat: "spirit",
    tier: 2,
  },
  steady_heart: {
    classId: "oracle",
    description: "Hold steady when the road tries to break your will.",
    id: "steady_heart",
    label: "Steady Heart",
    stat: "spirit",
    tier: 0,
  },
  study_weakness: {
    classId: "scholar",
    description: "Read the situation and act where the numbers bend.",
    id: "study_weakness",
    label: "Study Weakness",
    stat: "intellect",
    tier: 0,
  },
  vanish: {
    classId: "shade",
    description: "A decisive escape line. Easier check, harsher failure.",
    bridgeStat: "intellect",
    id: "vanish",
    label: "Vanish",
    requiredStats: { agility: 4, intellect: 3 },
    stat: "agility",
    tier: 3,
  },
  warded_plan: {
    classId: "scholar",
    description: "Accept a more complex route that protects you from mistakes.",
    id: "warded_plan",
    label: "Warded Plan",
    requiredStats: { intellect: 4 },
    stat: "intellect",
    tier: 1,
  },
};

export const classToChainId: Record<ClassId, number> = {
  oracle: 3,
  scholar: 1,
  shade: 2,
  vanguard: 0,
};

export const chainIdToClass: Record<number, ClassId> = {
  0: "vanguard",
  1: "scholar",
  2: "shade",
  3: "oracle",
};

export const skillToChainId: Record<SkillId, number> = {
  brace: 2,
  exploit_pattern: 7,
  force_entry: 1,
  knife_window: 11,
  last_stand: 4,
  mend_will: 14,
  misdirect: 10,
  oracle_oath: 16,
  perfect_theorem: 8,
  shadow_step: 9,
  shield_break: 3,
  spirit_breach: 15,
  steady_heart: 13,
  study_weakness: 5,
  vanish: 12,
  warded_plan: 6,
};

export const chainIdToSkill = Object.fromEntries(
  Object.entries(skillToChainId).map(([skill, chainId]) => [chainId, skill]),
) as Record<number, SkillId>;

export const skillPrerequisites: Partial<Record<SkillId, SkillId>> = {
  brace: "force_entry",
  exploit_pattern: "warded_plan",
  knife_window: "misdirect",
  last_stand: "shield_break",
  mend_will: "steady_heart",
  misdirect: "shadow_step",
  oracle_oath: "spirit_breach",
  perfect_theorem: "exploit_pattern",
  shield_break: "brace",
  spirit_breach: "mend_will",
  vanish: "knife_window",
  warded_plan: "study_weakness",
};

export function skillsForClass(classId: ClassId): SkillId[] {
  return Object.values(skillText)
    .filter((skill) => skill.classId === classId)
    .sort((first, second) => skillToChainId[first.id] - skillToChainId[second.id])
    .map((skill) => skill.id);
}

export function skillMask(skillId: SkillId): bigint {
  return BigInt(1) << BigInt(skillToChainId[skillId] - 1);
}

export function isSkillUnlocked(bits: bigint, skillId: SkillId): boolean {
  return (bits & skillMask(skillId)) !== BigInt(0);
}
