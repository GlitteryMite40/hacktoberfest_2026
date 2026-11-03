---
name: Kalp.io
version: 0.2
style: neo-brutalist folder cards (matches the reference screenshot)
themes: [light, dark]
colors:
  # Accent palette, sampled from the reference. IDENTICAL in light and dark mode.
  yellow: "#FFCF1E"
  green: "#3EC02F"
  lime: "#B1DA19"
  purple: "#8267F5"
  pink: "#FC5082"
  pale-yellow: "#FDE199"
  pale-yellow-tab: "#FFDB7F"
  gray: "#999999"
  icon-ink: "#000000" # icon glyphs and text on any accent colour: always black
  # Light theme
  light:
    background: "#FCFAF4"
    surface: "#FDFDFB"
    ink: "#000000" # borders and hard shadows
    text: "#111111"
    text-muted: "#5F5F5F"
  # Dark theme
  dark:
    background: "#000000"
    surface: "#111111"
    ink: "#FFFFFF" # borders and hard shadows
    text: "#FFFFFF"
    text-muted: "#A3A3A3"
typography:
  font-sans: "Inter Tight, Helvetica Neue, Helvetica, Arial, sans-serif"
  font-mono: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace"
  headline: "40/42, 800, -0.03em"
  title: "28/32, 800, -0.02em"
  section: "18/24, 700"
  card-title: "17/22, 700"
  body: "16/24, 500"
  meta: "13/16, 500"
  button: "17/20, 700"
shape:
  border: "2px solid ink"
  radius: { card: 12, tile: 10, button: 12, input: 12, pill: 999 }
  shadow:
    { card: "6px 6px 0 ink", control: "4px 4px 0 ink", pressed: "0 0 0 ink" }
spacing: { unit: 4, scale: [4, 8, 12, 16, 24, 32, 48] }
---

# Kalp.io Design System, v0.2

## 1. The idea in one sentence

Chunky, friendly, folder-style cards on a calm page: thick outlines, hard offset shadows, bold type and a handful of bright colours. One clear thing to do on every screen.

This system copies the visual language of the reference screenshot (a link-saving app with collection folders). Only the content is Kalp.io's.

## 2. Beginner-friendly rules (these beat everything else)

1. **One main job per screen.** One big yellow button; everything else is quieter.
2. **Plain words.** Say "Steps", "Needs first", "How you'll know it works". Avoid: node, graph, dependency, decomposition, webhook payload. (Webhook values are shown only on the GitHub tab, with plain instructions.)
3. **Show less, reveal more.** Details live in tappable sections that open (accordions). Never show more than about 5 things at once at the top level of a screen.
4. **Big and tappable.** Controls are at least 48px tall; spacing is generous (16 to 24px between blocks).
5. **Always tell people what happens next.** A "Next up" card is the first thing on every project.
6. **No login, no avatars, no account UI.**
7. **Friendly errors.** Say what happened, then what to do, in one or two short sentences.

## 3. Colour

### Accent palette (same in light and dark, never changes)

| Name        | Hex                   | Used for                                    |
| ----------- | --------------------- | ------------------------------------------- |
| Yellow      | #FFCF1E               | Primary buttons, page highlights, "Next up" |
| Green       | #3EC02F               | Done, progress                              |
| Lime        | #B1DA19               | Committed                                   |
| Purple      | #8267F5               | In progress, selected                       |
| Pink        | #FC5082               | Failed, delete, "needs attention"           |
| Pale yellow | #FDE199 (tab #FFDB7F) | Needs review                                |
| Gray        | #999999               | Blocked, "Unsorted"-style neutral           |

Rules:

- **Text and icon glyphs on any accent colour are always black (#000000)**, in both themes. Never white text on an accent colour.
- Accent colours never change in dark mode. Only the page, card, text and outline colours change.
- Project folders get an accent colour from this list in rotation (green, pink, purple, lime, pale yellow). Yellow is kept for actions, gray for neutral.

### Light theme

Page #FCFAF4 · card #FDFDFB · outlines and hard shadows #000000 · text #111111 · muted text #5F5F5F.

### Dark theme

Page **#000000** · card #111111 · **text #FFFFFF** · muted text #A3A3A3 · outlines and hard shadows become **#FFFFFF**. Icon tiles keep their accent colour and black glyph exactly as in light mode. Tile outlines use the outline colour (white).

### Step statuses (every status has a colour, an icon and a word)

| Status          | Tile colour              | Icon (black) | Word        |
| --------------- | ------------------------ | ------------ | ----------- |
| Not started     | card colour (empty tile) | empty circle | Not started |
| Next up (Ready) | Yellow                   | arrow-right  | Next up     |
| In progress     | Purple                   | pencil       | In progress |
| Committed       | Lime                     | git-commit   | Committed   |
| Completed       | Green                    | check        | Done        |
| Blocked         | Gray                     | lock         | Locked      |
| Failed          | Pink                     | x            | Didn't work |
| Needs review    | Pale yellow              | eye          | Check this  |

"Committed" means the learner tried the step. It is not proof it works. Never use the green check for it.

## 4. Typography

A tight, bold Helvetica-style neo-grotesque. The reference looks like Helvetica Now / Neue Haas Grotesk; the closest free font is **Inter Tight** (fallback Helvetica Neue, Arial). Use heavy weights for headings.

- Headline: 40/42, weight 800, tracking -0.03em, black/white, two short lines like "Save now. / Find anytime."
- Page title: 28/32, 800
- Section label: 18/24, 700 (like "My Collections")
- Card title: 17/22, 700
- Body: 16/24, 500
- Meta (like "57 links"): 13/16, 500, muted
- Buttons: 17/20, 700
- Step keys (`01.5`), file paths, commit codes: JetBrains Mono 13/18.

Desktop scales the headline to 56/58 and page title to 36/40.

## 5. Shape: the signature look

- **Outline:** 2px solid in the outline colour on every card, button, input, tile and pill.
- **Hard shadow:** no blur. Cards `6px 6px 0` in the outline colour; small controls `4px 4px 0`.
- **Radius:** cards 12, icon tiles 10, buttons 12, inputs 12, pills fully round.
- **Pressed state:** the element moves 4px right and down and its shadow shrinks to 0, like pressing a physical key. Focus: a 3px purple ring outside the outline.
- **No gradients, no blur, no glass, no soft shadows.**

## 6. Components

**Folder card** (the hero component, used for projects). A white card with a coloured tab sticking up behind its top-left edge (tab height 14px, width about 45% of the card, starting 14px in, rounded top corners, same outline and shadow). Inside: a square icon tile top-left (44px, accent colour, outline, black line icon), a small muted meta text to its right ("3 of 14 done"), and the project name bold at the bottom-left. Optional pill at the top right (like "NEW").

**Pill** ("NEW", "NEXT"). Small, all caps, 11px bold, accent fill, black text, 2px outline.

**Square icon button.** 44px, card colour, outline, control shadow, line icon. Used for back, help, more.

**Input bar.** Card colour, outline, radius 12, control shadow, 56px tall, left icon, muted placeholder, right icon. Next to it a square yellow button with a bold black "+" (or an arrow).

**Primary button.** Yellow fill, black bold text, outline, control shadow, 52px tall, full width on mobile.

**Secondary button.** Card colour, black/white bold text, outline, control shadow.

**Danger button.** Pink fill, black text. Used only on the final confirm in delete dialogs.

**Step row.** Card colour, outline, control shadow, 64px tall: status tile on the left (36px, status colour, icon), then mono step key (muted) above a bold title, chevron on the right. Locked steps use the gray tile and a lock but keep text fully readable.

**Next-up card.** A larger folder card with a yellow tab and yellow icon tile: small label "Next up", the step title in section size, one line of plain purpose, and a primary button "Open step".

**Progress bar.** 14px tall, outline, rounded, green fill, label above: "3 of 14 steps done".

**Segmented tabs.** Four pills: Steps, Map, Files, GitHub. Selected pill: yellow fill, black text, outline and control shadow. Others: card colour.

**Accordion.** Outlined card, bold title, plus/minus icon on the right; opens in place.

**Code/prompt box.** Surface-colour box with outline, mono text, max height 200px with scroll; a "Copy prompt" primary button underneath. After tapping: text becomes "Copied" with a check for 2 seconds.

**Dialog / bottom sheet.** Card colour, 2px outline, 8px hard shadow, one short sentence, two buttons: safe action first.

**Callout.** Outlined card with a small accent tile on the left (icon), one bold line and one short detail line. Info = purple tile, warning = yellow tile, error = pink tile, success = green tile.

**Empty state.** One chunky line-art folder illustration in the accent colours with black outline, a headline, one sentence and one yellow button.

## 7. Layout

- Mobile (reference layout, 390px): 20px side padding, single column, top bar with square icon buttons, headline, input bar, section label, two-column grid of folder cards with 16px gaps and 28px vertical gaps (room for tabs and shadows).
- Desktop (1440px): centred content column, max width 1120px; home keeps the same stacked structure with a 3-column folder grid; project page uses a main column plus a 440px step column on the right.
- Responsive down to 360px: one column; folder grid stays two columns down to 360px; bottom sheets replace side panels.
- Top bar: 64px, transparent over the page colour, logo left, square icon buttons right.

## 8. Dark mode: how to convert any screen

1. Page → #000000. Cards → #111111. Text → #FFFFFF. Muted text → #A3A3A3.
2. Every outline and hard shadow → #FFFFFF.
3. Do NOT change any accent colour, icon tile colour or icon glyph colour (glyphs stay black).
4. Text on yellow, green, lime, purple, pink, pale yellow and gray stays black.
5. Keep the same layout, spacing and shapes.

## 9. Accessibility

- Text contrast 4.5 or better everywhere. Black on every accent colour passes; that is why accent text is always black.
- Status is never colour alone: icon plus word.
- All controls keyboard reachable; focus ring 3px purple with 2px offset (white offset in dark mode).
- Touch targets 44px minimum, 48px preferred.
- Respect reduced motion: no press animation, no transitions.

## 10. Copy voice

Warm, short, specific. Examples:

- "Plan it before you vibe code it."
- "Your idea is 8 characters. Add a little more detail (at least 10)."
- "That repository isn't public yet. Kalp.io can only follow public ones for now."
- "Generation stopped at Architecture. Your work so far is saved. Tap Retry to continue."

## 11. Do and don't

Do

- Copy the reference's chunky outlines, hard shadows, folder tabs and bold type.
- Keep each screen to one big yellow action.
- Use the exact sample content from the prompts.

Don't

- No login, avatar, profile, quiz, commit-explanation or private-repo UI.
- No gradients, glass, blur, soft shadows or thin hairline styling.
- No white text on accent colours; no colour-only status; no "Committed" shown as a green check.
- Don't show more than one primary (yellow) button per screen.
