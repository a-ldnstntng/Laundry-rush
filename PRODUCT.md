# Sampayan Rush

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

A Filipino-themed rooftop laundry arcade game. Players rescue hanging laundry into the blue batya before worsening wind and rain soak or blow it away. The game has three escalating rounds and an end-of-run score and judgment from Nanay.

## Capabilities and Constraints

- Existing static HTML/CSS/JavaScript game with a Canvas renderer and procedural Web Audio.
- Mouse, touch and keyboard auto-save controls; English and Tagalog interface text.
- Cats, smoke, urgent laundry requests and Nanay's flying slipper are existing gameplay hazards.
- A round retry must keep completed-round progress and restore the current round's entry score and statistics. A fresh run starts from round one.
- Pausing, reading help, changing sound or changing language must preserve carried laundry and current run progress.
- Help must remain available during a run without quitting. Touch instructions must remain visible on phones.

## Brand Commitments

The user requested that cat art remain faithful to the existing aesthetic, and authorized fixing the UX audit while preserving it. Retain the existing Filipino rooftop pixel-art identity, game terminology, and bilingual character. This maintenance task does not replace the visual world or introduce a new camera design.

## Product Principles

- Label actions according to their actual effects on progress.
- Protect the current run when players pause, read instructions or adjust settings.
- Give touch players appropriate instructions and reachable controls.
- Preserve the complete game scene; offer an optional landscape suggestion rather than requiring rotation or cropping play targets.

## Evidence on Hand

- README.md: existing game purpose, features and static deployment structure.
- index.html, game.js, engine.js, audio.js: shipped implementation.
- .ui-review/2026-11-04-game-ux/review.md: UX findings accepted for repair by the user.
- .ui-review/2026-11-04-game-ux/fixes.md: implemented repair scope and verification.
- .impeccable/review/ux-*.png: captured help and phone states.

## Open Decisions

A dedicated portrait camera/layout and physical-device support guarantees have not been specified. The current maintenance work provides touch guidance, larger controls and an optional landscape suggestion.
