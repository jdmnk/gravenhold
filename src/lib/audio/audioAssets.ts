export const backgroundTracks = [
  "/assets/game/music/Grit Gatepulse.mp3",
] as const;

export const soundEffects = {
  choiceClick: "/assets/game/music/effects/woosh.wav",
} as const;

export type SoundEffectId = keyof typeof soundEffects;
