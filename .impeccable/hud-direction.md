# Gameplay HUD direction — Nanay’s Rooftop

## Scope and mode
Experience / Operate: redesign only the in-run HUD in index.html, hud.css, and portrait presentation in game.js. Keep gameplay mechanics, camera, character artwork, bilingual content, and every existing control behavior.

## Visual authority
The user approved the “Nanay’s Rooftop” proposal and specifically requested faithfulness to the current theme. The original rooftop, square pixel outlines, cream paper, blue ink, yellow highlights, original Nanay and batya are the authority. DESIGN.md documents the results screen; inherit its material vocabulary without imposing its composition.

## Structure
Upper left: clipped score slip, subordinate record, conditional combo tag. Upper center: three hanging shirt markers with numeric round label, weather plaque with condition-specific pixel icon and progress bar. Upper right: pause, sound, language. Lower left: existing animated Nanay portrait joined to the threat meter, conditional urgent utos and dismissible dialogue. Lower right: batya saved tally and progress. Keep controls reachable and all garments visible.

## First viewport
The rooftop remains the main visual. A player immediately distinguishes score, weather, round, and Nanay’s mood without a uniform row of boxes. Paper, clothespins, pixel silhouettes and original character animation tie the interface to the household. Desktop uses separated corners; portrait phones use the space around the full scene. Short landscape must preserve the play targets.

## Signature behavior
Nanay’s existing speech, mouth animation, blink and poke response share a panel with her galit/rage meter. Her idle expression now follows meter thresholds. Score ticks on scoring; round shirts change state; saved tally fills as laundry is banked. Weather icons distinguish clear, wind, rain and frozen time. Reduced motion disables CSS motion.

## Verification / constraints
English and Tagalog at 1536x864, 390x844, 844x390 and 320x640, including active combo, urgent utos, speech and danger meter. Protect carried laundry through HUD interactions. Numeric labels supplement icons and color. No generated assets or new dependencies. Code-led implementation of the explicitly approved concept; no image comp.

## FORM
Approved-direct local HUD extension within the established pixel-art world. Source of direction: the user accepted the single “Nanay’s Rooftop” proposal with “work on it, make sure the design is faithful to our current design / theme.” Seed: not applicable; no concept roll or comp was requested or run, and no seed is fabricated. Quality authority: the user's incumbent gameplay screenshot, existing rooftop/Nanay artwork, and the documented shipped paper-and-blue-ink vocabulary.

Portrait layout fits the complete scene between measured HUD regions without changing its camera. The lower region reserves216px for usual dialogue/utos; long messages scroll within62px. Final320px captures keep a300px-wide scene; a long-message stress check keeps293px.
