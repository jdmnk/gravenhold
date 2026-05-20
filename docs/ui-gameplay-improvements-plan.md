# Gravenhold Game Feel Improvements Plan

This plan replaces the completed tactical-readability UI plan. Cairo/Dojo remains the gameplay source of truth; these changes are presentation-only and must not change deterministic rules, forecasts, rewards, or equipment behavior.

## Goals

- Make Gravenhold feel more alive while preserving its direct RPG interface.
- Give intro, encounter, level-cleared, victory, and defeat screens distinct atmosphere.
- Make player actions feel tactile through restrained motion, feedback, and timing.
- Keep effects reusable, cheap, and respectful of `prefers-reduced-motion`.
- Avoid one-off decorative code scattered through `App.tsx`.

## Direction

The visual target is a dark dungeon RPG screen that breathes: torch flicker, drifting dust, small ember movement, subtle panel reveals, and clear result feedback. Effects should support game state and atmosphere, not become a flashy layer over the rules.

## Screen Coverage

1. Intro screen
   - Add ambient dust and low torch-like glow over the full-screen background.
   - Keep the start actions readable and central.
   - Keep network/seed metadata secondary and out of the main composition.

2. Encounter screen
   - Add a reusable effects layer over encounter art.
   - Normal encounters use dust, dim fog, and soft torch movement.
   - Boss encounters can later use heavier pulse, ash, or pressure effects.

3. Level cleared screen
   - Add calmer reward-focused effects: faint motes, brief item-card reveal, and a small shine on reward icons.
   - Make reward card entrance feel like loot being presented.

4. End screens
   - Victory should feel warmer and steadier than a normal level clear.
   - Defeat should feel heavier and lower energy without hiding the restart action.
   - Both should use the same large-image alignment as the main screen.

5. Core game UI
   - Keep top bar, stats, progression, and gear mostly stable.
   - Add motion only where it clarifies state: current level, boss markers, health loss, stat gain, pending action.

## Reusable Pieces

1. `SceneEffectsLayer`
   - Shared overlay component for intro, encounter art, reward art, and complete art.
   - Profiles: `intro`, `encounter`, `boss`, `reward`, `victory`, `defeat`.
   - CSS-only first. No canvas until there is a clear need.

2. Motion CSS
   - Centralize keyframes and reduced-motion overrides in `App.css` initially.
   - If the CSS grows large, split it later into a dedicated stylesheet.

3. Result feedback
   - Animate `LatestResultBadge` in.
   - Success gets a restrained gold pulse.
   - Failure gets a short red hit pulse.

4. Reward reveal
   - Stagger reward cards with CSS custom properties.
   - Add icon shine/flicker on hover only.

## Implementation Phases

### Phase 1: Ambient Life

- Add `SceneEffectsLayer`.
- Apply it to:
  - intro screen
  - encounter art
  - level cleared art
  - victory screen
  - defeat screen
- Add reduced-motion fallback.
- Keep all effects CSS-only and asset-free.

### Phase 2: Action Feedback

- Add click/commit animation to choice cards.
- Animate latest result badge on new results.
- Add health bar pulse on damage and stat/readout pulse on gain.
- Make pending actions feel like resolving, not disabled.

### Phase 3: Reward And Gear Feel

- Stagger reward cards on level cleared.
- Add subtle item icon shine on reward hover.
- Pulse equipped slots when gear changes.
- Keep reward cards neutral enough to avoid noisy stat-color overload.

### Phase 4: Progression Presence

- Pulse current level marker lightly.
- Give boss markers a faint ember treatment.
- Briefly animate newly cleared levels.
- Add stronger next-boss anticipation when the next level is a boss.

### Phase 5: Boss And End-Screen Identity

- Add boss-specific effect profile.
- Add victory and defeat profile refinements.
- Consider small generated overlay sprites only if CSS effects are not enough.

## Current Execution Status

- [x] Replaced outdated completed tactical-readability plan.
- [x] Phase 1: Ambient Life.
- [ ] Phase 2: Action Feedback. Started with choice press states and latest-result pulses.
- [ ] Phase 3: Reward And Gear Feel. Started with reward-card reveal and icon hover motion.
- [ ] Phase 4: Progression Presence.
- [ ] Phase 5: Boss And End-Screen Identity.
