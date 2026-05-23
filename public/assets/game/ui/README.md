# Gravenhold UI Assets

These files are display-only UI materials for the Gravenhold client. Runtime
gameplay rules, stats, item metadata, and chain assumptions must stay in Cairo
or typed client state, not in image assets.

## Included Assets

- `bg-dark.png` and `section-texture.png` are UI surface textures.
- `action-frame.png`, `action-selected-frame.png`, and
  `action-unselected-frame.png` are encounter choice frames.
- `str-icon.png`, `agi-icon.png`, `dex-icon.png`, `spirit-icon.png`, and the
  files in `generated/` are stat and ability icons.

Generated game art and item images live under `public/assets/game/backgrounds`
and `public/assets/game/items`. See [docs/art-direction.md](../../../../docs/art-direction.md)
for asset generation rules and source tracking expectations.
