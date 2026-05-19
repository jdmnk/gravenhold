import {
  backgroundTracks,
  soundEffects,
  type SoundEffectId,
} from "./audioAssets";

const musicElements = new Map<string, HTMLAudioElement>();
const effectBuffers = new Map<string, Promise<AudioBuffer>>();
const preloadedMusic = new Set<string>();

let audioContext: AudioContext | null = null;
let activeMusic: HTMLAudioElement | null = null;
let activeTrackIndex = 0;
let musicEnabled = false;
let sfxEnabled = true;
let musicVolume = 0.28;
let sfxVolume = 0.72;

const musicPlaylist: readonly string[] = backgroundTracks;

function browserAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function musicElementFor(src: string): HTMLAudioElement {
  const cached = musicElements.get(src);
  if (cached) return cached;

  const audio = new Audio(src);
  audio.preload = "metadata";
  audio.volume = musicVolume;
  audio.addEventListener("ended", handleMusicEnded);
  musicElements.set(src, audio);
  return audio;
}

function preloadMusicTrack(index: number) {
  if (musicPlaylist.length === 0) return;
  const src = musicPlaylist[index % musicPlaylist.length];
  if (preloadedMusic.has(src)) return;
  preloadedMusic.add(src);
  musicElementFor(src).load();
}

async function effectBufferFor(src: string): Promise<AudioBuffer> {
  const cached = effectBuffers.get(src);
  if (cached) return cached;

  const pending = (async () => {
    const context = browserAudioContext();
    if (!context) throw new Error("Web Audio API is not available.");

    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to load audio effect ${src}: ${response.status}`);
    }

    return context.decodeAudioData(await response.arrayBuffer());
  })();

  effectBuffers.set(src, pending);
  return pending;
}

function handleMusicEnded() {
  if (!musicEnabled || musicPlaylist.length === 0) return;
  activeTrackIndex = (activeTrackIndex + 1) % musicPlaylist.length;
  void playCurrentTrack();
}

async function playCurrentTrack() {
  if (!musicEnabled || musicPlaylist.length === 0) return;

  const src = musicPlaylist[activeTrackIndex];
  const next = musicElementFor(src);
  next.volume = musicVolume;

  if (activeMusic && activeMusic !== next) {
    activeMusic.pause();
    activeMusic.currentTime = 0;
  }

  activeMusic = next;
  const nextTrackIndex = (activeTrackIndex + 1) % musicPlaylist.length;
  if (nextTrackIndex !== activeTrackIndex) {
    preloadMusicTrack(nextTrackIndex);
  }
  await next.play();
}

export const gameAudio = {
  bootstrap() {
    preloadMusicTrack(0);
    void effectBufferFor(soundEffects.choiceClick).catch((error) => {
      console.error(error);
    });
  },

  isMusicEnabled() {
    return musicEnabled;
  },

  isSfxEnabled() {
    return sfxEnabled;
  },

  async setMusicEnabled(enabled: boolean) {
    musicEnabled = enabled;

    if (!enabled) {
      activeMusic?.pause();
      return;
    }

    await playCurrentTrack();
  },

  setSfxEnabled(enabled: boolean) {
    sfxEnabled = enabled;
  },

  setMusicVolume(volume: number) {
    musicVolume = volume;
    if (activeMusic) activeMusic.volume = volume;
  },

  setSfxVolume(volume: number) {
    sfxVolume = volume;
  },

  async playEffect(effect: SoundEffectId) {
    if (!sfxEnabled) return;

    const context = browserAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
      await context.resume();
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = await effectBufferFor(soundEffects[effect]);
    gain.gain.value = sfxVolume;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  },
};
