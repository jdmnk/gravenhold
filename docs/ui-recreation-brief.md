# Gravenhold UI Recreation Brief

## Purpose

The interface must make Gravenhold feel like a focused progression game, not a static control panel. The player should always understand where they are in the run, what is being asked of them, what their options mean, and how each decision changes the character they are building.

The UI should support the core loop clearly: facing an encounter, comparing possible approaches, committing to a choice, seeing the outcome, receiving growth or damage, choosing rewards, equipping gear, and moving deeper into the run.

## Player Needs

The player needs immediate orientation. They should be able to recognize the current run state without reading instructions or hunting across the screen.

The player needs meaningful anticipation. The interface should help them feel the shape of the journey ahead, the pressure of future gates, and the importance of preparing a coherent build.

The player needs confident decision-making. Each available action should communicate what kind of choice it is, what character strength it depends on, what the likely risk is, and what may change afterward.

The player needs readable consequences. Success, failure, growth, damage, rewards, equipment changes, and level progression should feel visible and memorable without becoming noisy.

The player needs a sense of build identity. The UI should make specialization, gear support, and repeated stat choices feel like an evolving character direction rather than disconnected numbers.

The player needs continuity. Moving between encounter, reward, equipment, and progression states should feel like one uninterrupted journey rather than separate screens competing for attention.

## Gameplay Communication

The interface should expose the rules that matter to the current decision. It should avoid hiding important gameplay state inside long explanations, technical abbreviations, or peripheral panels.

Difficulty, effective stats, health risk, growth, rewards, and equipment relevance should be understandable at the moment they matter.

The game should make boss gates and preparation pressure legible. The player should feel that earlier decisions are shaping later outcomes.

Rewards should feel connected to the current build. The player should understand whether an item strengthens their direction, fills a weakness, or changes their plan.

Inventory and equipment should feel like part of character development, not separate bookkeeping.

## Mood

The mood should be tense, deliberate, and adventurous. The player should feel like they are descending through a hostile old world where every choice leaves a mark.

The experience should feel tactile and reactive. Actions should have weight, outcomes should land clearly, and progression should feel earned.

The tone should be mysterious but not obscure. The game can feel dangerous and atmospheric, but the interaction model must remain understandable and direct.

The UI should feel game-like, authored, and alive. It should not feel like a dashboard, spreadsheet, placeholder prototype, or decorative website wrapped around game data.

The experience should support focus. The player should be drawn toward the current decision, while surrounding information quietly reinforces context and stakes.

## Interaction Feel

Transitions should help the player understand state changes. They should make progress, resolution, reward moments, and equipment changes feel connected.

Feedback should be immediate but controlled. The UI should acknowledge input, show pending resolution, and reveal results without disrupting orientation.

Hover and focus states should help preview intent and consequence. They should clarify choices rather than add distraction.

Important events should persist long enough to register. The player should not miss success, failure, reward, or progression feedback because it vanished too quickly.

## Product Constraints

The UI must preserve deterministic gameplay. React displays decoded chain state and submits actions; it must not decide outcomes or duplicate rule-bearing game logic.

The interface must remain playable and direct. Atmosphere should support decision-making, not bury it.

The UI must serve the current V1 game: a single-player deterministic progression RPG with stat choices, health pressure, rewards, equipment, and boss gates.

The redesign should be allowed to rethink presentation from scratch, but it should not change the game loop unless a separate gameplay decision is made.
