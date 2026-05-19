const HOW_IT_WORKS_SEEN_KEY = "gravenhold:how-it-works:v1";

export function hasSeenHowItWorksIntro() {
  try {
    return window.localStorage.getItem(HOW_IT_WORKS_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markHowItWorksIntroSeen() {
  try {
    window.localStorage.setItem(HOW_IT_WORKS_SEEN_KEY, "1");
  } catch {
    // Non-critical UI preference. Gameplay state stays onchain.
  }
}

export function resetHowItWorksIntroSeen() {
  try {
    window.localStorage.removeItem(HOW_IT_WORKS_SEEN_KEY);
  } catch {
    // Non-critical UI preference. Gameplay state stays onchain.
  }
}
