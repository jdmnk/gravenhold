# Gravenhold UI Gameplay Improvements Plan

This plan keeps Cairo/Dojo gameplay as the source of truth. React should only present decoded chain state, forecasts, rewards, equipment, and history more clearly.

## Goals

- Make each encounter easier to read before the player chooses.
- Make deterministic checks feel tactical and satisfying.
- Reinforce build identity and specialization without adding new gameplay rules.
- Keep the main scene layout managed by shared components instead of one-off overlay positioning.

## Execution Plan

1. Encounter dossier
   - Add a compact encounter props row inside the shared scene stage.
   - Show encounter type, difficulty, and base check.
   - Show boss support requirements when the current encounter is a boss.

2. Hover preview math
   - Expand the tactical hover preview with effective stat, final difficulty, and pass margin.
   - Show `Pass +N` or `Short N` so the player does not need mental subtraction.
   - Keep approach, payoff, and danger readable in the same preview component.

3. Encounter identity badges
   - Give category and difficulty clear badge treatment.
   - Use restrained medieval/fantasy UI language, not decorative clutter.
   - Keep badges text-first and deterministic-data-driven.

4. Build direction readout
   - Add a small build identity readout using existing stats, equipment bonuses, and recent choices.
   - Show dominant stat and whether the build is focused or drifting.

5. Reward comparison
   - On reward cards, compare the offered item against the currently equipped item in the same slot.
   - Show stat deltas and whether it is an upgrade, sidegrade, or off-build.

6. Boss gate preview
   - Make boss support and failure risk more prominent before and during boss encounters.
   - Surface support stat value, required support, difficulty penalty, and damage penalty from forecast data.

7. Run progress strip
   - Add a compact 20-level path strip with boss levels marked.
   - Highlight current level and completed levels.
   - Avoid adding a procedural map or changing progression rules.

8. Result breakdown
   - Let the scene event dock briefly explain resolved checks.
   - Show stat vs difficulty, success/failure, stat gain, health loss, level clear, and reward unlock.

## Current Execution Status

- [x] 1. Encounter dossier
- [x] 2. Hover preview math
- [x] 3. Encounter identity badges
- [x] 4. Build direction readout
- [x] 5. Reward comparison
- [x] 6. Boss gate preview
- [x] 7. Run progress strip
- [x] 8. Result breakdown
