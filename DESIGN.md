---
name: Sampayan Rush
description: Filipino rooftop pixel arcade; documented results surface.
colors:
  report-paper: "#fff3d4"
  report-rule: "#c8cfba"
  report-blue: "#163e76"
  report-body: "#263d49"
  report-label: "#41545a"
  score-paper: "#f0dfb5"
  replay-yellow: "#f5bd19"
  replay-hover: "#ffd252"
  title-paper: "#e5e6d3"
  action-ink: "#17232b"
  loss-red: "#a02b33"
typography:
  headline:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'VT323', monospace"
    fontSize: "25px"
    fontWeight: 400
    lineHeight: 1.2
  score:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "32px"
    lineHeight: 1.3
  tally-value:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "19px"
    lineHeight: 1.3
  label:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "8px"
    lineHeight: 1.5
  phone-label:
    fontFamily: "'VT323', monospace"
    fontSize: "18px"
    lineHeight: 1
  action:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "13px"
    lineHeight: 1.6
    letterSpacing: "0"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  wide: "20px"
  section: "24px"
components:
  button-replay:
    backgroundColor: "{colors.replay-yellow}"
    textColor: "{colors.action-ink}"
    typography: "{typography.action}"
    padding: "16px 12px"
  button-replay-hover:
    backgroundColor: "{colors.replay-hover}"
  button-title:
    backgroundColor: "{colors.title-paper}"
    textColor: "{colors.report-body}"
    typography: "{typography.action}"
    padding: "16px 12px"
  button-title-hover:
    backgroundColor: "{colors.report-paper}"
  report:
    backgroundColor: "{colors.report-paper}"
    textColor: "{colors.report-blue}"
    padding: "28px 36px 24px"
---

# Design System: Sampayan Rush

## Overview

**Creative North Star: "Nanay’s Laundry Report"**

The existing world is a Filipino rooftop pixel arcade: expressive original character art, pixel type, square outlines and tactile block shadows. This document records the shipped end-of-run surface, rather than prescribing new compositions for gameplay or other screens.

The results surface turns Nanay’s judgment into a cream sheet clipped to a clothesline. A dim pre-rendered rooftop covers the finished game completely. The portrait, commentary and crooked grade stamp introduce the verdict; score and dry laundry dominate the tally. English and Tagalog share this structure.

**Key Characteristics:**
- Original pixel portraits and rooftop artwork.
- Cream paper with blue ink and ruled statistics.
- Dominant score pair, six supporting tallies.
- Yellow replay and pale title actions outside the sheet.

## Colors

Warm paper and yellow actions sit against the dim rooftop; blue ink carries the report’s structure.

### Primary
- **Replay Yellow:** the visually strongest action, used for starting another run; the hover shade brightens it.
- **Report Blue:** heading, score values, SVG tally symbols and strong horizontal rules.

### Secondary
- **Loss Red:** soaked and blown-away values and icons; also the failing grade’s ink.
- Grade stamps have their own paired paper and ink: gold for S, green for A, blue-gray for B and red for F. These are verdict states, not general-purpose app accents.

### Neutral
- **Report Paper:** the sheet and title-action hover surface.
- **Score Paper:** the paired primary statistics’ warmer inset band.
- **Title Paper:** the secondary action’s pale fill.
- **Report Body / Report Label:** commentary and supporting labels.
- **Report Rule:** quieter dividers between phone tally rows.
- **Action Ink:** dark action outlines and replay text.

**The Outcome Ink Rule.** Keep loss tallies red while the remaining statistics use blue; grade color communicates its separate verdict state.

## Typography

**Display Font:** Press Start 2P, with monospace fallback.
**Body Font:** VT323, with monospace fallback.

Pixel display lettering gives scores and actions their arcade weight. The narrower VT323 voice accommodates Nanay’s bilingual commentary and longer phone labels. The frontmatter records desktop roles and the reusable phone label role; responsive variations follow the shipped CSS.

### Hierarchy
- **Headline:** the report heading; reduces to 20px below 900px, 18px on phones and 16px in short landscape.
- **Score:** the two dominant values; 21px on phones, with the dry fraction at 18px, and 20px in short landscape.
- **Tally value:** supporting statistics; 16px below 900px, 15px on phones and 14px in short landscape. Numbers use tabular alignment.
- **Body:** commentary; 22px below 900px and on phones, 20px with 1.1 line height in short landscape.
- **Label:** secondary desktop and landscape tally labels. Phone secondary labels use the phone-label role; primary score labels keep Press Start 2P at 8px on phones and landscape, 9px on desktop.
- **Action:** reduces to 11px on phones and 10px in short landscape.

**The Readable Tally Rule.** Preserve 8px Press Start 2P secondary labels on desktop and landscape, and 18px VT323 secondary labels on phones; retain space for bilingual wrapping.

## Layout

The results overlay scrolls vertically, honors safe-area top/bottom padding and uses a fixed full-viewport background. Its centered content has a maximum width of 1040px. The sheet, rope and pegs establish one focal object; the decorative batya disappears below 900px.

The desktop verdict is portrait / commentary / stamp. A six-column statistic grid places each primary score across three columns, then six smaller tallies across one row. Primary cells share a tinted band and dividing rule; supporting cells remain unboxed.

At widths up to 600px, the portrait and grade sit together above centered commentary. The primary score pair stays side by side; six supporting tallies become two rows of three. Actions stack at full width. At heights up to 550px and widths above 600px, tighter padding, smaller portrait/type and hidden tally icons preserve the horizontal arrangement. These are results breakpoints, not a mandate for gameplay.

The action group sits outside the report, at most 760px wide, with a 1.25:1 replay/title split on desktop. Gaps and section padding follow the recorded spacing steps. Buttons have minimum heights of 64px on desktop, 52px on phones and 44px in short landscape.

## Elevation & Depth

Depth is deliberately pixelated and structural: dark unblurred block shadows, inset paper trim, square outlines, a rope and wooden pegs. Preserve this user-approved arcade identity. The rooftop’s dark overlay separates scenery from readable paper; it covers the completed gameplay instead of allowing play objects to show through.

### Shadow Vocabulary
- **Report block:** `8px 8px 0 #0d2028, inset 0 0 0 6px #e5d5ad`.
- **Action block:** `5px 5px #0d2028`; pressed actions translate by 3px on both axes and reduce the shadow to `2px 2px #0d2028`.
- **Portrait block:** `4px 4px #d9c596`.

## Shapes

The report and controls have square corners and substantial dark outlines. The sheet uses a 4px outline; actions and the portrait use 3px outlines. The grade stamp uses a 4px dashed outline and a negative seven-degree rotation. Slightly tilted pegs, rope and stamps supply physical character within the pixel geometry. Render raster artwork with crisp pixel scaling.

## Components

### Buttons

Chunky arcade controls, placed beneath the report. Replay is yellow; return to title is pale. Hover lifts the inherited button geometry by two pixels and brightens the fill; pressed controls depress. Keyboard focus uses a cream 3px outline offset by 4px. State changes retain the inherited 0.05s stepped transform/shadow transition.

### Laundry report

A single cream, blue-ruled sheet with pegs, portrait, commentary, stamp and statistics. The report itself is an article, with a labeled results heading; scenery and decorative art are hidden from assistive technology. Preserve the existing bilingual strings and dynamically populated values.

### Nanay verdict

Nanay shares one 32px portrait design between the animated HUD and results SVGs: a low side bun with a coral clip, swept dark hair with gray strands, a tapered jaw and visible neck, small gold earrings, a teal floral daster, and a cream bimpo with red woven stripes over one shoulder. Sloping, cropped shoulders replace the closed oval torso. Retain the warm skin, dark pixel outline and crisp nearest-neighbor scaling. The portrait is happy for grades S/A and disappointed for B/F. The stamp independently communicates S/A/B/F; slipper rage uses the red failure treatment and a smaller label. A record badge appears only for a new high score. On entry, results scroll resets to the top and keyboard focus moves to replay.

### Tally grid

Score and saved-dry fraction are the dominant pair. Six smaller SVG-icon tallies follow: soaked wet, blown away, max combo, air rescues, swish tosses and utos done. They share the report’s rules instead of becoming separate floating cards. Short landscape hides icons to retain readable labels and values.

## Do's and Don'ts

### Do:
- **Do** preserve the approved Filipino rooftop pixel art, square outlines and block shadows.
- **Do** keep the primary score pair larger than the six supporting tallies.
- **Do** preserve bilingual wrapping and the responsive label treatments.
- **Do** retain the clean, dim, full-cover rooftop behind the report.

### Don't:
- **Don't** move replay or return-to-title actions inside the report sheet.
- **Don't** let finished-game objects remain visible through the results backdrop.
- **Don't** generalize this report composition into requirements for unrelated gameplay screens.

Not canonized: the record badge’s decorative star glyphs remain an incumbent copy detail, not a reusable icon convention. One-off paper scuffs and prop dimensions are not system tokens.

Evidence: `results.css`; results markup, inherited button styles and `onGameOver` in `index.html`; `.impeccable/results-desktop.png`, `.impeccable/results-phone.png`, `.impeccable/results-landscape.png`; brand scope in `PRODUCT.md`. No comp or quality board was supplied; the approved concept was implemented directly in code.
