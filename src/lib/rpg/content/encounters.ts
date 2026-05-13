import type { Encounter } from "../types";
import { createEncounterOptions } from "./helpers";

export const fixedEncounters: Record<number, Encounter> = {
  1: {
    category: "obstacle",
    description: "A ruined gate blocks the road into the valley.",
    difficulty: "normal",
    id: "fixed_01_fallen_gate",
    options: createEncounterOptions({
      agility: {
        description: "Slip through the warped bars before they settle.",
        label: "Squeeze through",
      },
      intellect: {
        description: "Find the weak hinge and loosen the frame.",
        label: "Study the hinge",
      },
      spirit: {
        description: "Steady your breathing and push through the fear.",
        label: "Hold steady",
      },
      strength: {
        description: "Lift the broken beam and shove the gate aside.",
        label: "Force it open",
      },
    }),
    title: "The Fallen Gate",
  },
  2: {
    category: "survival",
    description: "Cold rain turns the hillside path into sliding mud.",
    difficulty: "normal",
    id: "fixed_02_mudslide_path",
    options: createEncounterOptions({
      agility: {
        description: "Move lightly across stones before the slope gives way.",
        label: "Step fast",
      },
      intellect: {
        description: "Plot a safer route by reading the drainage lines.",
        label: "Read the slope",
      },
      spirit: {
        description: "Keep your focus while the ground shifts underfoot.",
        label: "Keep calm",
      },
      strength: {
        description: "Drive your boots deep and pull yourself upward.",
        label: "Climb hard",
      },
    }),
    title: "Mudslide Path",
  },
  3: {
    category: "social",
    description: "A nervous outpost guard demands proof you belong here.",
    difficulty: "normal",
    id: "fixed_03_border_guard",
    options: createEncounterOptions({
      agility: {
        description: "Move around the checkpoint while attention drifts.",
        label: "Slip past",
      },
      intellect: {
        description: "Answer with enough detail to sound expected.",
        label: "Talk your way in",
      },
      spirit: {
        description: "Meet the guard's suspicion with unshaken confidence.",
        label: "Stand firm",
      },
      strength: {
        description: "Make it clear that blocking you is unwise.",
        label: "Intimidate",
      },
    }),
    title: "The Border Guard",
  },
  4: {
    category: "mystery",
    description: "A stone marker hums with old instructions no one remembers.",
    difficulty: "normal",
    id: "fixed_04_speaking_marker",
    options: createEncounterOptions({
      agility: {
        description: "Trace the shallow carved route with precise fingertips.",
        label: "Trace the marks",
      },
      intellect: {
        description: "Compare the symbols and infer their command order.",
        label: "Decode it",
      },
      spirit: {
        description: "Listen for the intent beneath the marker's hum.",
        label: "Attune",
      },
      strength: {
        description: "Turn the heavy marker toward the road.",
        label: "Rotate it",
      },
    }),
    title: "The Speaking Marker",
  },
  5: {
    category: "enemy",
    description: "Scouts of the first guardian test everyone who approaches.",
    difficulty: "hard",
    id: "fixed_05_guardian_scouts",
    options: createEncounterOptions({
      agility: {
        description: "Draw them out of formation and strike the opening.",
        label: "Outmaneuver",
      },
      intellect: {
        description: "Identify their signal pattern and break their timing.",
        label: "Read tactics",
      },
      spirit: {
        description: "Refuse their pressure and make them hesitate first.",
        label: "Break resolve",
      },
      strength: {
        description: "Meet their charge with a direct counterattack.",
        label: "Drive forward",
      },
    }),
    title: "Guardian Scouts",
  },
  6: {
    category: "obstacle",
    description: "A collapsed bridge hangs over a black ravine.",
    difficulty: "normal",
    id: "fixed_06_collapsed_bridge",
    options: createEncounterOptions({
      agility: {
        description: "Leap from broken stone to broken stone.",
        label: "Leap across",
      },
      intellect: {
        description: "Work out where the remaining structure still holds.",
        label: "Find support",
      },
      spirit: {
        description: "Guide yourself across without looking down.",
        label: "Master fear",
      },
      strength: {
        description: "Move a fallen brace into place for a crossing.",
        label: "Shift the brace",
      },
    }),
    title: "Collapsed Bridge",
  },
  7: {
    category: "mystery",
    description: "A sealed archive door opens only to a correct sequence.",
    difficulty: "normal",
    id: "fixed_07_archive_seal",
    options: createEncounterOptions({
      agility: {
        description: "Press the sequence before the mechanism resets.",
        label: "Move quickly",
      },
      intellect: {
        description: "Solve the sequence from the worn inscriptions.",
        label: "Solve sequence",
      },
      spirit: {
        description: "Sense the pulse that marks the right order.",
        label: "Feel the rhythm",
      },
      strength: {
        description: "Hold the locking wheels in place as they turn.",
        label: "Hold wheels",
      },
    }),
    title: "Archive Seal",
  },
  8: {
    category: "survival",
    description: "A dust storm swallows the road and erases every landmark.",
    difficulty: "normal",
    id: "fixed_08_dust_storm",
    options: createEncounterOptions({
      agility: {
        description: "Keep low and move between gusts.",
        label: "Thread the gusts",
      },
      intellect: {
        description: "Navigate by wind direction and slope.",
        label: "Calculate bearing",
      },
      spirit: {
        description: "Keep panic from turning each step into a mistake.",
        label: "Center yourself",
      },
      strength: {
        description: "Push forward with steady force through the storm.",
        label: "Press on",
      },
    }),
    title: "The Dust Storm",
  },
  9: {
    category: "social",
    description: "A trapped caravan leader begs for help but hides something.",
    difficulty: "hard",
    id: "fixed_09_caravan_secret",
    options: createEncounterOptions({
      agility: {
        description: "Check the camp quietly before choosing what to believe.",
        label: "Scout camp",
      },
      intellect: {
        description: "Question the story until the missing piece appears.",
        label: "Interrogate",
      },
      spirit: {
        description: "Read the fear beneath the lie and answer it directly.",
        label: "Offer trust",
      },
      strength: {
        description: "Take command and force the leader to stop stalling.",
        label: "Demand truth",
      },
    }),
    title: "The Caravan Secret",
  },
  10: {
    category: "enemy",
    description: "Silent hunters guard the approach to the second gate.",
    difficulty: "hard",
    id: "fixed_10_silent_hunters",
    options: createEncounterOptions({
      agility: {
        description: "Keep moving so their ambush never settles.",
        label: "Stay mobile",
      },
      intellect: {
        description: "Use their shadows to reveal their positions.",
        label: "Expose pattern",
      },
      spirit: {
        description: "Hold your nerve while they try to isolate you.",
        label: "Resist pressure",
      },
      strength: {
        description: "Crash into the nearest hunter before they surround you.",
        label: "Break line",
      },
    }),
    title: "Silent Hunters",
  },
  11: {
    category: "obstacle",
    description: "A cliff ladder of rusted spikes leads into the high pass.",
    difficulty: "normal",
    id: "fixed_11_spike_ladder",
    options: createEncounterOptions({
      agility: {
        description: "Climb with quick, exact placements.",
        label: "Climb cleanly",
      },
      intellect: {
        description: "Choose only the spikes that still carry weight.",
        label: "Inspect spikes",
      },
      spirit: {
        description: "Ignore the height and keep your grip steady.",
        label: "Silence fear",
      },
      strength: {
        description: "Haul yourself up by brute force.",
        label: "Pull upward",
      },
    }),
    title: "Spike Ladder",
  },
  12: {
    category: "mystery",
    description: "Mirrors in an old hall show different versions of the path.",
    difficulty: "hard",
    id: "fixed_12_mirror_hall",
    options: createEncounterOptions({
      agility: {
        description: "Move only when the false reflections lag behind.",
        label: "Time movement",
      },
      intellect: {
        description: "Find the one reflection that obeys real light.",
        label: "Test reflections",
      },
      spirit: {
        description: "Hold to your own identity until the hall releases you.",
        label: "Anchor self",
      },
      strength: {
        description: "Shatter the mirrors that press closest.",
        label: "Smash through",
      },
    }),
    title: "Mirror Hall",
  },
  13: {
    category: "survival",
    description: "Poisoned mist rises from cracked vents in the pass.",
    difficulty: "hard",
    id: "fixed_13_venom_mist",
    options: createEncounterOptions({
      agility: {
        description: "Dash between clear pockets before they close.",
        label: "Sprint gaps",
      },
      intellect: {
        description: "Track the vent pattern and mark a clean route.",
        label: "Map vents",
      },
      spirit: {
        description: "Slow your breath and resist the mist's panic.",
        label: "Control breath",
      },
      strength: {
        description: "Block vents with loose stone as you advance.",
        label: "Seal vents",
      },
    }),
    title: "Venom Mist",
  },
  14: {
    category: "social",
    description: "A divided camp argues over whether to let you pass.",
    difficulty: "hard",
    id: "fixed_14_divided_camp",
    options: createEncounterOptions({
      agility: {
        description: "Move through the argument before anyone blocks you.",
        label: "Slip through",
      },
      intellect: {
        description: "Offer a solution both sides can accept.",
        label: "Mediate",
      },
      spirit: {
        description: "Speak to the fear driving the camp apart.",
        label: "Inspire trust",
      },
      strength: {
        description: "Make one clear demand and hold the center.",
        label: "Take command",
      },
    }),
    title: "The Divided Camp",
  },
  15: {
    category: "enemy",
    description: "The third guardian's vanguard blocks the mountain gate.",
    difficulty: "hard",
    id: "fixed_15_mountain_vanguard",
    options: createEncounterOptions({
      agility: {
        description: "Cut through the flank before the line turns.",
        label: "Strike flank",
      },
      intellect: {
        description: "Draw the vanguard into exposing its captain.",
        label: "Bait captain",
      },
      spirit: {
        description: "Stand against their chant until it falters.",
        label: "Defy chant",
      },
      strength: {
        description: "Break the shield line with a direct assault.",
        label: "Crack shields",
      },
    }),
    title: "Mountain Vanguard",
  },
  16: {
    category: "obstacle",
    description: "A frozen stair climbs through thin air and falling ice.",
    difficulty: "hard",
    id: "fixed_16_frozen_stair",
    options: createEncounterOptions({
      agility: {
        description: "Cross the slick steps before frost grips your boots.",
        label: "Move lightly",
      },
      intellect: {
        description: "Choose a path where the ice is oldest and strongest.",
        label: "Read ice",
      },
      spirit: {
        description: "Keep warmth in your limbs through force of will.",
        label: "Hold warmth",
      },
      strength: {
        description: "Cut footholds into the ice as you climb.",
        label: "Hack footholds",
      },
    }),
    title: "Frozen Stair",
  },
  17: {
    category: "mystery",
    description: "A locked observatory turns with the stars above.",
    difficulty: "hard",
    id: "fixed_17_star_observatory",
    options: createEncounterOptions({
      agility: {
        description: "Reach the moving controls before the window passes.",
        label: "Catch controls",
      },
      intellect: {
        description: "Align the lenses to the correct constellation.",
        label: "Align stars",
      },
      spirit: {
        description: "Follow the pull of the star that watches you back.",
        label: "Follow omen",
      },
      strength: {
        description: "Hold the rotating mechanism in place.",
        label: "Brace gears",
      },
    }),
    title: "Star Observatory",
  },
  18: {
    category: "survival",
    description: "The path narrows beside a storm that climbs upward.",
    difficulty: "hard",
    id: "fixed_18_upward_storm",
    options: createEncounterOptions({
      agility: {
        description: "Step between lightning strikes and sudden gusts.",
        label: "Dodge storm",
      },
      intellect: {
        description: "Predict the storm's rhythm from its echoes.",
        label: "Predict rhythm",
      },
      spirit: {
        description: "Refuse the storm's pull and keep your purpose clear.",
        label: "Hold purpose",
      },
      strength: {
        description: "Anchor yourself and advance one step at a time.",
        label: "Anchor forward",
      },
    }),
    title: "The Upward Storm",
  },
  19: {
    category: "social",
    description: "The last pilgrims ask why you deserve the final road.",
    difficulty: "hard",
    id: "fixed_19_last_pilgrims",
    options: createEncounterOptions({
      agility: {
        description: "Show the speed and precision your journey has forged.",
        label: "Demonstrate skill",
      },
      intellect: {
        description: "Explain the pattern that brought you this far.",
        label: "Make your case",
      },
      spirit: {
        description: "Answer with conviction rather than argument.",
        label: "Speak truth",
      },
      strength: {
        description: "Show that you can carry the burden ahead.",
        label: "Bear weight",
      },
    }),
    title: "The Last Pilgrims",
  },
  20: {
    category: "enemy",
    description: "The final gate gathers every trial into one last warning.",
    difficulty: "hard",
    id: "fixed_20_final_gate",
    options: createEncounterOptions({
      agility: {
        description: "Move through the shifting defenses before they lock.",
        label: "Pass defenses",
      },
      intellect: {
        description: "Recognize the trials' shared structure and open the way.",
        label: "Solve pattern",
      },
      spirit: {
        description: "Stand whole before the pressure of the final gate.",
        label: "Remain whole",
      },
      strength: {
        description: "Force the gate to acknowledge your arrival.",
        label: "Open by force",
      },
    }),
    title: "The Final Gate",
  },
};

export const randomEncounters: Encounter[] = [
  {
    category: "enemy",
    description: "Road raiders move in when they think you are tired.",
    difficulty: "normal",
    id: "random_road_raiders",
    options: createEncounterOptions({
      agility: {
        description: "Circle away from their strongest attacker.",
        label: "Circle out",
      },
      intellect: {
        description: "Turn their impatience into a bad formation.",
        label: "Set trap",
      },
      spirit: {
        description: "Refuse to show fear and make them doubt the attack.",
        label: "Hold nerve",
      },
      strength: {
        description: "Hit first and make the rest reconsider.",
        label: "Hit first",
      },
    }),
    title: "Road Raiders",
  },
  {
    category: "obstacle",
    description: "A locked service door promises a shorter route.",
    difficulty: "normal",
    id: "random_locked_service_door",
    options: createEncounterOptions({
      agility: {
        description: "Pick the lock with careful pressure.",
        label: "Pick lock",
      },
      intellect: {
        description: "Infer the key pattern from scratched marks.",
        label: "Read marks",
      },
      spirit: {
        description: "Wait until instinct points to the right moment.",
        label: "Trust instinct",
      },
      strength: {
        description: "Break the latch without slowing down.",
        label: "Break latch",
      },
    }),
    title: "Locked Service Door",
  },
  {
    category: "mystery",
    description: "A whispering shrine offers advice in exchange for focus.",
    difficulty: "normal",
    id: "random_whispering_shrine",
    options: createEncounterOptions({
      agility: {
        description: "Catch the shrine's shifting light before it fades.",
        label: "Catch light",
      },
      intellect: {
        description: "Separate useful clues from ritual noise.",
        label: "Parse whispers",
      },
      spirit: {
        description: "Open yourself to the shrine without losing control.",
        label: "Commune",
      },
      strength: {
        description: "Move the altar stone into its old position.",
        label: "Move altar",
      },
    }),
    title: "Whispering Shrine",
  },
  {
    category: "survival",
    description: "A night without shelter threatens to drain your momentum.",
    difficulty: "normal",
    id: "random_exposed_night",
    options: createEncounterOptions({
      agility: {
        description: "Find a narrow dry place before the cold settles.",
        label: "Find cover",
      },
      intellect: {
        description: "Build a windbreak from what the trail provides.",
        label: "Rig shelter",
      },
      spirit: {
        description: "Rest despite discomfort and keep despair away.",
        label: "Endure night",
      },
      strength: {
        description: "Carry stones and branches into a sturdy camp.",
        label: "Build camp",
      },
    }),
    title: "Exposed Night",
  },
  {
    category: "social",
    description: "A suspicious scout watches from the tree line.",
    difficulty: "normal",
    id: "random_suspicious_scout",
    options: createEncounterOptions({
      agility: {
        description: "Vanish from sight and approach from a better angle.",
        label: "Disappear",
      },
      intellect: {
        description: "Offer information that proves you are no easy mark.",
        label: "Trade facts",
      },
      spirit: {
        description: "Meet suspicion with honest calm.",
        label: "Show calm",
      },
      strength: {
        description: "Show enough force to end the scout's confidence.",
        label: "Display force",
      },
    }),
    title: "Suspicious Scout",
  },
  {
    category: "obstacle",
    description: "A fallen pillar pins a narrow passage shut.",
    difficulty: "normal",
    id: "random_fallen_pillar",
    options: createEncounterOptions({
      agility: {
        description: "Slide through the lowest gap without getting trapped.",
        label: "Slide under",
      },
      intellect: {
        description: "Find the leverage point that matters.",
        label: "Find leverage",
      },
      spirit: {
        description: "Keep patient while dust and pressure close in.",
        label: "Stay patient",
      },
      strength: {
        description: "Lift the pillar just enough to pass.",
        label: "Lift pillar",
      },
    }),
    title: "Fallen Pillar",
  },
  {
    category: "enemy",
    description: "A lean beast stalks the trail from above.",
    difficulty: "normal",
    id: "random_stalking_beast",
    options: createEncounterOptions({
      agility: {
        description: "Dodge the first pounce and strike the exposed side.",
        label: "Dodge pounce",
      },
      intellect: {
        description: "Use its hunting pattern against it.",
        label: "Predict pounce",
      },
      spirit: {
        description: "Hold eye contact until it breaks first.",
        label: "Face it down",
      },
      strength: {
        description: "Meet the pounce with a brutal counter.",
        label: "Counterattack",
      },
    }),
    title: "Stalking Beast",
  },
  {
    category: "mystery",
    description: "An old map contradicts the road beneath your feet.",
    difficulty: "normal",
    id: "random_false_map",
    options: createEncounterOptions({
      agility: {
        description: "Scout both branches before committing.",
        label: "Scout branches",
      },
      intellect: {
        description: "Spot where the mapmaker deliberately lied.",
        label: "Find lie",
      },
      spirit: {
        description: "Choose the path that feels least corrupted.",
        label: "Trust pull",
      },
      strength: {
        description: "Cut through the blocked direct path.",
        label: "Clear route",
      },
    }),
    title: "False Map",
  },
  {
    category: "survival",
    description: "A sudden flood cuts across the low road.",
    difficulty: "normal",
    id: "random_flash_flood",
    options: createEncounterOptions({
      agility: {
        description: "Hop across debris before it drifts apart.",
        label: "Cross debris",
      },
      intellect: {
        description: "Find where the current loses strength.",
        label: "Read current",
      },
      spirit: {
        description: "Move without panic while the water rises.",
        label: "Stay composed",
      },
      strength: {
        description: "Push through the current before it deepens.",
        label: "Wade through",
      },
    }),
    title: "Flash Flood",
  },
  {
    category: "social",
    description: "A wounded messenger asks for aid but delays your route.",
    difficulty: "normal",
    id: "random_wounded_messenger",
    options: createEncounterOptions({
      agility: {
        description: "Carry the message ahead and return by a faster path.",
        label: "Run message",
      },
      intellect: {
        description: "Extract the critical information before time is lost.",
        label: "Assess message",
      },
      spirit: {
        description: "Stabilize the messenger and restore their courage.",
        label: "Comfort",
      },
      strength: {
        description: "Carry the messenger to safety yourself.",
        label: "Carry them",
      },
    }),
    title: "Wounded Messenger",
  },
  {
    category: "enemy",
    description: "A shield patrol blocks the road and waits for you to make the first mistake.",
    difficulty: "normal",
    id: "random_shield_patrol",
    options: createEncounterOptions({
      agility: {
        description: "Slip around the shield wall before it closes.",
        label: "Flank wall",
      },
      intellect: {
        description: "Call out the captain's weak command and break formation.",
        label: "Break orders",
      },
      spirit: {
        description: "Meet their discipline with steadier resolve.",
        label: "Outlast pressure",
      },
      strength: {
        description: "Drive into the wall and force a gap.",
        label: "Split shields",
      },
    }),
    title: "Shield Patrol",
  },
  {
    category: "enemy",
    description: "A tunnel crawler drops from the ceiling with hooked claws.",
    difficulty: "normal",
    id: "random_tunnel_crawler",
    options: createEncounterOptions({
      agility: {
        description: "Roll clear and strike before it turns.",
        label: "Roll under",
      },
      intellect: {
        description: "Use the scrape marks to predict its next drop.",
        label: "Read scrapes",
      },
      spirit: {
        description: "Hold still long enough to make it reveal itself.",
        label: "Master panic",
      },
      strength: {
        description: "Catch the creature's weight and slam it down.",
        label: "Slam it",
      },
    }),
    title: "Tunnel Crawler",
  },
  {
    category: "enemy",
    description: "A bandit archer controls the ridge above the trail.",
    difficulty: "normal",
    id: "random_ridge_archer",
    options: createEncounterOptions({
      agility: {
        description: "Sprint between shots and reach the ridge.",
        label: "Rush cover",
      },
      intellect: {
        description: "Count the firing rhythm and move during the reload.",
        label: "Time reload",
      },
      spirit: {
        description: "Walk through the threat without giving fear a foothold.",
        label: "Steady advance",
      },
      strength: {
        description: "Raise a broken panel and push forward behind it.",
        label: "Carry shield",
      },
    }),
    title: "Ridge Archer",
  },
  {
    category: "enemy",
    description: "A swarm of ember mites pours from a cracked brazier.",
    difficulty: "normal",
    id: "random_ember_mites",
    options: createEncounterOptions({
      agility: {
        description: "Step through the swarm where it thins.",
        label: "Thread swarm",
      },
      intellect: {
        description: "Starve the swarm by sealing its warmest vents.",
        label: "Seal vents",
      },
      spirit: {
        description: "Quiet the frantic heat until the swarm scatters.",
        label: "Soothe flame",
      },
      strength: {
        description: "Smother the brazier under fallen stone.",
        label: "Crush brazier",
      },
    }),
    title: "Ember Mites",
  },
  {
    category: "obstacle",
    description: "A chain lift hangs jammed between two floors of the ruin.",
    difficulty: "normal",
    id: "random_jammed_chain_lift",
    options: createEncounterOptions({
      agility: {
        description: "Climb the side chain before the lift slips.",
        label: "Climb chain",
      },
      intellect: {
        description: "Release the right catch without dropping the platform.",
        label: "Free catch",
      },
      spirit: {
        description: "Keep the trapped travelers calm while the lift groans.",
        label: "Calm lift",
      },
      strength: {
        description: "Pull the lift level by raw effort.",
        label: "Haul lift",
      },
    }),
    title: "Jammed Chain Lift",
  },
  {
    category: "obstacle",
    description: "A hall of pressure plates waits under a skin of dust.",
    difficulty: "normal",
    id: "random_pressure_plate_hall",
    options: createEncounterOptions({
      agility: {
        description: "Cross on the narrow safe edges.",
        label: "Edge step",
      },
      intellect: {
        description: "Map the safe plates from their spacing.",
        label: "Map plates",
      },
      spirit: {
        description: "Trust one clean rhythm and do not hesitate.",
        label: "Keep rhythm",
      },
      strength: {
        description: "Brace the trigger stones before crossing.",
        label: "Jam plates",
      },
    }),
    title: "Pressure Plate Hall",
  },
  {
    category: "obstacle",
    description: "A root-choked stair twists down into darkness.",
    difficulty: "normal",
    id: "random_root_choked_stair",
    options: createEncounterOptions({
      agility: {
        description: "Duck and weave through the living knots.",
        label: "Weave roots",
      },
      intellect: {
        description: "Find where the roots avoid old ward lines.",
        label: "Trace wards",
      },
      spirit: {
        description: "Ask the roots for passage without surrendering direction.",
        label: "Ask passage",
      },
      strength: {
        description: "Tear open a usable stairway.",
        label: "Rip path",
      },
    }),
    title: "Root-Choked Stair",
  },
  {
    category: "obstacle",
    description: "A cracked aqueduct spills water across a narrow ledge.",
    difficulty: "normal",
    id: "random_spilling_aqueduct",
    options: createEncounterOptions({
      agility: {
        description: "Cross the slick ledge in one committed burst.",
        label: "Burst across",
      },
      intellect: {
        description: "Redirect the spill through a lower channel.",
        label: "Redirect flow",
      },
      spirit: {
        description: "Keep your balance by focusing past the roar.",
        label: "Hear silence",
      },
      strength: {
        description: "Hold a fallen slab against the torrent.",
        label: "Hold slab",
      },
    }),
    title: "Spilling Aqueduct",
  },
  {
    category: "mystery",
    description: "A door repeats your last words and waits for a truer answer.",
    difficulty: "normal",
    id: "random_echo_door",
    options: createEncounterOptions({
      agility: {
        description: "Catch the door's latch during the echo delay.",
        label: "Catch latch",
      },
      intellect: {
        description: "Phrase the answer so the echo completes the key.",
        label: "Shape answer",
      },
      spirit: {
        description: "Speak with enough conviction that the echo stops arguing.",
        label: "Speak true",
      },
      strength: {
        description: "Hold the door half-open against the echo's pull.",
        label: "Hold open",
      },
    }),
    title: "Echo Door",
  },
  {
    category: "mystery",
    description: "A mural changes whenever you look directly at it.",
    difficulty: "normal",
    id: "random_shifting_mural",
    options: createEncounterOptions({
      agility: {
        description: "Move across the room while reading it from the corner of your eye.",
        label: "Read sidelong",
      },
      intellect: {
        description: "Compare each version and isolate the constant symbol.",
        label: "Find constant",
      },
      spirit: {
        description: "Let the image settle into the meaning it wants to show.",
        label: "Let settle",
      },
      strength: {
        description: "Press the mural panels into their original alignment.",
        label: "Set panels",
      },
    }),
    title: "Shifting Mural",
  },
  {
    category: "mystery",
    description: "A bronze compass spins toward dangers you cannot see.",
    difficulty: "normal",
    id: "random_bronze_compass",
    options: createEncounterOptions({
      agility: {
        description: "Move each time the needle twitches away from you.",
        label: "Follow twitches",
      },
      intellect: {
        description: "Infer the hidden hazards from the needle's pattern.",
        label: "Infer hazards",
      },
      spirit: {
        description: "Quiet the compass until it points at intent, not fear.",
        label: "Quiet needle",
      },
      strength: {
        description: "Hold the compass steady long enough to read it.",
        label: "Hold steady",
      },
    }),
    title: "Bronze Compass",
  },
  {
    category: "mystery",
    description: "A library ladder rolls by itself between sealed shelves.",
    difficulty: "normal",
    id: "random_restless_ladder",
    options: createEncounterOptions({
      agility: {
        description: "Leap to the ladder before it escapes again.",
        label: "Leap aboard",
      },
      intellect: {
        description: "Name the shelf sequence that controls its route.",
        label: "Name sequence",
      },
      spirit: {
        description: "Convince the old mechanism that you mean no theft.",
        label: "Offer intent",
      },
      strength: {
        description: "Pin the ladder rails and force it to stop.",
        label: "Pin rails",
      },
    }),
    title: "Restless Ladder",
  },
  {
    category: "survival",
    description: "Thin mountain air makes each step cost more than it should.",
    difficulty: "normal",
    id: "random_thin_air",
    options: createEncounterOptions({
      agility: {
        description: "Use short, efficient bursts between rests.",
        label: "Burst climb",
      },
      intellect: {
        description: "Set a pace that keeps breath and slope aligned.",
        label: "Set pace",
      },
      spirit: {
        description: "Hold your focus while your body begs to stop.",
        label: "Hold focus",
      },
      strength: {
        description: "Push through with slow and stubborn force.",
        label: "Push onward",
      },
    }),
    title: "Thin Air",
  },
  {
    category: "survival",
    description: "A field of glass grass cuts boots, gloves, and patience.",
    difficulty: "normal",
    id: "random_glass_grass",
    options: createEncounterOptions({
      agility: {
        description: "Step only where the blades bend away.",
        label: "Step clean",
      },
      intellect: {
        description: "Mark the safe path by how the glass reflects sky.",
        label: "Read shine",
      },
      spirit: {
        description: "Move without anger while each cut tries to distract you.",
        label: "Ignore cuts",
      },
      strength: {
        description: "Sweep a path with a heavy branch.",
        label: "Sweep path",
      },
    }),
    title: "Glass Grass",
  },
  {
    category: "survival",
    description: "A hungry fog steals direction and sound from the pass.",
    difficulty: "normal",
    id: "random_hungry_fog",
    options: createEncounterOptions({
      agility: {
        description: "Move quickly between the last visible landmarks.",
        label: "Dash marks",
      },
      intellect: {
        description: "Use echoes and slope to reconstruct the road.",
        label: "Track echoes",
      },
      spirit: {
        description: "Refuse the fog's whispering invitations.",
        label: "Deny whispers",
      },
      strength: {
        description: "Carry a ringing post and force a straight line.",
        label: "Drive line",
      },
    }),
    title: "Hungry Fog",
  },
  {
    category: "survival",
    description: "A sinkhole opens beneath the camp before dawn.",
    difficulty: "normal",
    id: "random_dawn_sinkhole",
    options: createEncounterOptions({
      agility: {
        description: "Jump clear and pull your gear after you.",
        label: "Jump clear",
      },
      intellect: {
        description: "Spot the stable rim before the ground drops again.",
        label: "Find rim",
      },
      spirit: {
        description: "Keep everyone responding instead of freezing.",
        label: "Rally camp",
      },
      strength: {
        description: "Drag the loaded pack out before it disappears.",
        label: "Drag pack",
      },
    }),
    title: "Dawn Sinkhole",
  },
  {
    category: "social",
    description: "A toll keeper demands payment in secrets instead of coins.",
    difficulty: "normal",
    id: "random_secret_toll",
    options: createEncounterOptions({
      agility: {
        description: "Slip through while the keeper records another traveler's answer.",
        label: "Slip toll",
      },
      intellect: {
        description: "Offer a harmless secret that sounds valuable enough.",
        label: "Trade riddle",
      },
      spirit: {
        description: "Refuse the bargain without provoking the keeper.",
        label: "Refuse calmly",
      },
      strength: {
        description: "Make the keeper decide the price is not worth collecting.",
        label: "Deter keeper",
      },
    }),
    title: "Secret Toll",
  },
  {
    category: "social",
    description: "A frightened apprentice mistakes you for the threat they fled.",
    difficulty: "normal",
    id: "random_frightened_apprentice",
    options: createEncounterOptions({
      agility: {
        description: "Keep distance and move where your hands stay visible.",
        label: "Keep distance",
      },
      intellect: {
        description: "Ask precise questions that prove you know the difference.",
        label: "Question gently",
      },
      spirit: {
        description: "Lower their panic before it turns into danger.",
        label: "Ease panic",
      },
      strength: {
        description: "Stand between them and the road until they feel protected.",
        label: "Guard them",
      },
    }),
    title: "Frightened Apprentice",
  },
  {
    category: "social",
    description: "Two rival guides each insist the other path is a trap.",
    difficulty: "normal",
    id: "random_rival_guides",
    options: createEncounterOptions({
      agility: {
        description: "Scout both paths before either guide can object.",
        label: "Scout both",
      },
      intellect: {
        description: "Compare their details until one story breaks.",
        label: "Compare claims",
      },
      spirit: {
        description: "Find the fear both guides are hiding behind pride.",
        label: "Name fear",
      },
      strength: {
        description: "Take responsibility for the decision and make them follow.",
        label: "Lead decisively",
      },
    }),
    title: "Rival Guides",
  },
  {
    category: "social",
    description: "A silent judge bars the stair and weighs every gesture.",
    difficulty: "normal",
    id: "random_silent_judge",
    options: createEncounterOptions({
      agility: {
        description: "Make one flawless movement that proves discipline.",
        label: "Show precision",
      },
      intellect: {
        description: "Present the cleanest argument for your passage.",
        label: "State case",
      },
      spirit: {
        description: "Stand honestly beneath the judge's attention.",
        label: "Stand honest",
      },
      strength: {
        description: "Lift the trial weight and hold it without complaint.",
        label: "Hold weight",
      },
    }),
    title: "Silent Judge",
  },
];
