import { useCallback, useEffect, useState } from "react";

import { gameAudio } from "./gameAudio";

const musicStorageKey = "gravenhold.audio.music";
const sfxStorageKey = "gravenhold.audio.sfx";

function storedBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function persistBoolean(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
}

export function useGameAudio() {
  const [musicEnabled, setMusicEnabledState] = useState(() =>
    storedBoolean(musicStorageKey, false),
  );
  const [sfxEnabled, setSfxEnabledState] = useState(() =>
    storedBoolean(sfxStorageKey, true),
  );

  useEffect(() => {
    gameAudio.bootstrap();
    gameAudio.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  const setMusicEnabled = useCallback(async (enabled: boolean) => {
    setMusicEnabledState(enabled);
    persistBoolean(musicStorageKey, enabled);

    try {
      await gameAudio.setMusicEnabled(enabled);
    } catch (error) {
      setMusicEnabledState(false);
      persistBoolean(musicStorageKey, false);
      console.error(error);
    }
  }, []);

  const setSfxEnabled = useCallback((enabled: boolean) => {
    setSfxEnabledState(enabled);
    persistBoolean(sfxStorageKey, enabled);
    gameAudio.setSfxEnabled(enabled);
  }, []);

  const playChoiceClick = useCallback(() => {
    void gameAudio.playEffect("choiceClick").catch((error) => {
      console.error(error);
    });
  }, []);

  return {
    musicEnabled,
    playChoiceClick,
    setMusicEnabled,
    setSfxEnabled,
    sfxEnabled,
  };
}
