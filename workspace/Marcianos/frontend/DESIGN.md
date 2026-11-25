---
name: Marcianos Reservas
description: Public table booking for Marcianos, Porto Alegre, set in the colours of a Guaíba dusk.
colors:
  dusk-violet: "#5b4b8a"
  dusk-violet-hover: "#4a3c75"
  dusk-violet-soft: "#ece8f6"
  dusk-amber: "#8a4b12"
  dusk-danger: "#a3302a"
  dusk-ground: "#f3f1f7"
  dusk-surface: "#ffffff"
  dusk-line: "#e3dfec"
  dusk-line-strong: "#cec8dc"
  dusk-ink: "#2b2440"
  dusk-ink-soft: "#5f5875"
  sky-1: "#f8d9bd"
  sky-2: "#f2c6aa"
  sky-3: "#ecbcb2"
  sky-4: "#e2b7c2"
  sky-5: "#d5b5d3"
  sky-6: "#c6b5e2"
  sky-7: "#b3a9dc"
  sky-8: "#a29bd2"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "52px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  headline-confirm:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline-phone:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body-small:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  micro:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  ring: "12px"
  key: "14px"
  band: "20px"
  card: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "24px"
  xl: "32px"
  group: "36px"
components:
  button-primary:
    backgroundColor: "{colors.dusk-violet}"
    textColor: "{colors.dusk-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 32px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.dusk-violet-hover}"
  key:
    backgroundColor: "{colors.dusk-surface}"
    textColor: "{colors.dusk-ink-soft}"
    rounded: "{rounded.key}"
    height: "56px"
  key-selected:
    backgroundColor: "{colors.dusk-violet-soft}"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.key}"
  sky-slot:
    textColor: "{colors.dusk-ink}"
    height: "88px"
  sky-band:
    rounded: "{rounded.band}"
  field:
    backgroundColor: "{colors.dusk-surface}"
    textColor: "{colors.dusk-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.key}"
    padding: "12px 14px"
  summary-bar:
    backgroundColor: "{colors.dusk-surface}"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.band}"
    padding: "16px 24px"
  reservation-card:
    backgroundColor: "{colors.dusk-surface}"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  status-pill:
    backgroundColor: "{colors.dusk-surface}"
    textColor: "{colors.dusk-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Marcianos Reservas

This file documents the public booking world ("dusk"): the booking page, the reservation widget and its confirmation card. The same stylesheet (`src/index.css`) also carries an older, separate world for the owner's admin panel (warm ground, mint action colour, Nunito, its own `panel-` tokens). That panel world is an out-of-scope neighbour; none of its tokens belong to this system, and neither world should borrow from the other.

## Overview

**Creative North Star: "The Evening Is the Schedule"**

Booking a table at Marcianos means choosing a moment of the night. The times between 18:30 and 22:00 are painted as one continuous band of Guaíba sky, peach at the first sitting fading to lilac at the last, so the guest reads the evening as colour before reading it as numbers. Everything around that band stays quiet: a pale, cool lilac-grey ground, white surfaces with soft lilac-grey hairlines, deep plum-ink text and a single muted violet for action.

The page is one wide column (up to 1120px), not a phone-width form. Choices are big, calm keys laid out across the full width; the form reads top to bottom as people, day, time, details, confirm. A summary bar pinned to the bottom of the viewport keeps what has been chosen, and the confirm action, always within reach. Density is generous but not airy: groups are separated by 36px, keys by 8 to 12px.

Rank comes from weight and size, not from a second typeface or from colour. Depth is near-flat: hairlines and tonal fills do the work; the only rings are state rings drawn inside elements. The confirmation card reuses the sky colour of the chosen time across its header, so the result feels like a ticket for that exact moment of the evening.

**Key Characteristics:**
- One continuous sky band of equal cells for the times; colour is computed from each slot's position in the night.
- Cool lilac-grey ground, white surfaces, lilac-grey hairlines; never cream or warm paper.
- Muted violet is the only action colour; plum-ink carries text.
- Rounded keys (14px) for every choice; pill-shaped primary button.
- Flat surfaces; state shown with inset rings and tonal fills, not shadows.
- The chosen time's sky colour follows the guest: summary swatch, then the confirmation card's header.

## Colors

A cool, low-chroma dusk palette with one muted violet for action, and a warm-to-cool sky ramp that is the only saturated colour on the page.

### Primary
- **Muted Dusk Violet** (`dusk-violet`): the confirm button, the selected key's border and inset ring, keyboard focus outlines, the text caret, and text links ("reserve pelo WhatsApp", "Fazer outra reserva"). Hover deepens to **Night Violet** (`dusk-violet-hover`).
- **Violet Mist** (`dusk-violet-soft`): the fill of a selected key and the text selection highlight. A tint, never a block of colour.

### Secondary
- **The Guaíba Sky** (`sky-1` peach through `sky-8` lilac): eight stops, interpolated across however many time slots the restaurant configures, so the first slot is always peach and the last always lilac. Used only to represent a time: the slot cells, the 14px swatch in the summary bar, and the header of the confirmation card. A disabled slot mixes its sky 35% into the ground.

### Tertiary
- **Ember Amber** (`dusk-amber`): caution only, and only on the light ground: the cleared-time notice and the warning glyph on the large-group note. It never sits on a sky cell: on the darker lilac cells it falls to 2.6:1, so inside the band scarcity is set in plum ink at bold weight instead.
- **Brick Red** (`dusk-danger`): field errors, invalid field borders, and the save-failure alert's border (at 40%).

### Neutral
- **Dusk Ground** (`dusk-ground`): the page background, also painted on `html` so overscroll matches.
- **White Surface** (`dusk-surface`): keys, fields, the summary bar (at 95% with a backdrop blur), the confirmation card body.
- **Lilac Hairline** (`dusk-line`): resting borders on keys and cards, the summary bar's top edge, the footer rule.
- **Firm Hairline** (`dusk-line-strong`): field borders, key hover borders, the dashed sky placeholder, scrollbar thumb.
- **Plum Ink** (`dusk-ink`): headings, values, selected key text, slot time labels, and the selected slot ring.
- **Soft Plum Ink** (`dusk-ink-soft`): secondary text, unselected key text, legend values, footer.

### Named Rules
**The Sky Is Time Rule.** The sky colours appear only where a reservation time is represented (band, swatch, card header). They are never decoration, never a background for anything else.

**The One Action Colour Rule.** Violet is the only colour that means "do this". Amber and red speak only of scarcity and error.

## Typography

**Display Font:** system UI sans (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)
**Body Font:** the same stack

**Character:** one plain, familiar sans for everything as shipped; hierarchy is set by weight (400 / 500 / 600) and size, with tabular figures wherever numbers are compared. The display and headline roles currently fall back to the system face; that is the build's state, not a rule against a chosen display face.

### Hierarchy
- **Display** (600, 52px, line-height 1, -0.02em, tabular): the reserved time on the confirmation card's sky header.
- **Headline** (600, 30px on phones / 38px from 640px, -0.02em): the page title "Reserve sua mesa" and the confirmation title (36px there).
- **Title** (600, 17px): fieldset legends ("Quantas pessoas?", "Que dia?"), confirmation card values. Slot times and day numbers sit at 18-20px / 600, tabular.
- **Body** (400, 16px, 1.4): intro line, field text (16px is also the iOS no-zoom floor), summary line; 15px for notes and footer.
- **Label** (500, 13-14px): field labels (14px / 500), day names in day keys, card term labels (13px / 400), slot notes (12px / 500).

### Named Rules
**The Weight Ranks Rule.** Within a family, rank by weight and size; colour stays reserved for action and state, and labels stay in sentence case.

**The Tabular Time Rule.** Every number a guest compares (people, dates, times) uses tabular figures.

## Layout

A single column, max 1120px, centred, with 20px side gutters on phones and 32px from 640px. Header top padding grows from 32px to 56px at 1024px.

- **Groups** stack with 36px between them; each fieldset legend sits 12px above its controls, with the current value right-aligned on the legend line.
- **People keys:** six equal columns at every width (1-5 and 6+), gaps 8px / 12px.
- **Day keys:** auto-fit columns with an 88px minimum, so the week spans the full width on desktop and wraps on phones.
- **Sky band:** one row of equal cells (up to 8 columns) from 640px; 4 columns below, wrapping into rows. No gaps between cells: the band is one continuous surface.
- **Details:** name and WhatsApp side by side from 640px; notes span both.
- **Summary bar:** sticky to the viewport bottom at every width; full-bleed with a top hairline on phones (respecting the safe-area inset), an inset rounded panel with a full border from 640px.
- **Confirmation:** same 1120px column and gutters; content constrained to 720px on the shared left edge. Action keys stack on phones, three columns from 640px.
- **Footer:** same column, separated by a hairline; contact items stack, then run in a row from 1024px.

## Elevation & Depth

The world is flat. Surfaces separate by tone (white on lilac-grey ground) and hairlines, never by drop shadow. `box-shadow` exists only as rings that express state: the selected key's 1px inset violet ring, the selected slot's 3px inset ink ring, the field focus glow, and the slot focus halo. The summary bar's 95% white with backdrop blur is the one translucent layer, so the form shows faintly beneath it as it scrolls.

### Shadow Vocabulary
- **Selected key ring** (`box-shadow: inset 0 0 0 1px var(--color-dusk-violet)`): doubles the violet border to 2px visually without shifting layout.
- **Selected slot ring** (`box-shadow: inset 0 0 0 3px var(--color-dusk-ink)` on a pseudo-element inset 6px, radius 12px): the chosen time, drawn inside the cell so the band's clipping and neighbouring cells never cut it. Eases in from scale 0.96.
- **Slot focus halo** (`inset 0 0 0 2px var(--color-dusk-violet), 0 0 0 3px rgb(255 255 255 / 0.85)`; ink 3px when also selected): keyboard focus on a sky cell.
- **Field focus glow** (`box-shadow: 0 0 0 3px rgb(91 75 138 / 0.18)`): violet border plus a soft violet halo.

### Named Rules
**The Rings, Not Shadows Rule.** State is drawn with rings and tonal fills. Nothing in the booking world lifts or casts a shadow.

## Shapes

Soft, consistent rounding that grows with the size of the surface: 12px for the in-cell slot ring, 14px for keys and fields, 20px for the sky band, the summary panel and the sky placeholder, 24px for the confirmation card, full pills for the primary button, the status pill and the time swatch. The sky band clips its cells to its 20px outer corners; individual cells are square inside it. Borders are 1px hairlines; the empty-band placeholder uses a dashed firm hairline. Icons are Lucide line icons at 16-20px.

## Components

### Buttons
Calm and decisive: one filled pill, everything else a key.
- **Shape:** full pill (999px).
- **Primary:** violet fill, white 15-16px / 600 text, 48px tall with 20px sides on phones, 56px tall with 32px sides from 640px. Label states the outcome ("Confirmar reserva", "Enviar pré-reserva" for groups of 6+, "Reservando…" with a spinner while sending).
- **Hover / Active:** deepens to night violet on hover-capable pointers only; presses to scale 0.97.
- **Text link:** violet, 600, underlined with a 4px offset; used for secondary actions such as "Fazer outra reserva".

### Keys (choice chips)
Every discrete choice is a key: people count, day, the large-group stepper, and the confirmation card's actions.
- **Style:** white surface, lilac hairline, 14px corners, soft-ink text; 56px tall for people, 76px for days (day name over date), 44px square for steppers, 48px minimum for card actions.
- **State:** hover firms the border and darkens text; selected fills with violet mist, violet border plus 1px inset ring, ink text; press scales to 0.97; disabled drops to 50% opacity. Transitions run 160ms on the strong ease-out.

### Sky Band (signature)
The times as one continuous band of equal cells, each painted with its position's sky colour.
- **Cell:** 88px minimum height, centred time (18px / 600, tabular), optional note below (12px / 500): "últimos lugares" in plum ink at 700 when nearly full (amber is too weak on the lilac end of the band); "esgotado", "fechado", "já passou" on disabled cells, which also strike through the time and fade the sky into the ground.
- **Selected:** a 3px plum-ink ring inside the cell, 6px inset, 12px radius, easing in over 200ms from scale 0.96. No lift, no shadow.
- **Hover:** brightness 1.04 and saturation 1.1.
- **Focus:** 2px violet inset ring with a white halo; ink when also selected.
- **Empty:** before a day is chosen, a dashed 20px-rounded placeholder at the band's height explains what to do.

### Inputs / Fields
- **Style:** white, 1px firm hairline, 14px corners, 12px by 14px padding, 16px text; labels sit above at 14px / 500 ink.
- **Focus:** border turns violet with a 3px soft violet glow.
- **Error:** brick-red border and a red 14px / 500 message below, linked by `aria-describedby`; submitting focuses and scrolls to the first error.

### Summary Bar
Sticky at the bottom of the viewport: a 14px sky swatch of the chosen time, the chosen day and time (16px / 600), a second line with people and the single next step ("falta o horário", "tudo pronto"), and the primary button on the right.

### Reservation Card
The confirmation, revealed once top-down (620ms clip reveal on the strong ease-out; a fade under reduced motion).
- **Corner Style:** 24px, clipped.
- **Header:** filled with the chosen time's sky colour; long date (14px / 500 ink at 80%), the time as display type, and a white status pill ("Confirmada" / "Pré-reserva").
- **Body:** white, 24px padding, a two-column term list (13px soft-ink terms over 17px / 600 values).
- **Border:** 1px lilac hairline. No shadow.

## Do's and Don'ts

### Do:
- **Do** paint times with the sky ramp computed from each slot's position in the evening, first slot peach, last slot lilac, whatever the number of slots.
- **Do** carry the chosen time's sky colour forward into the summary swatch and the confirmation card's header.
- **Do** use the key (white, lilac hairline, 14px corners, violet-mist selected state) for every discrete choice.
- **Do** draw selection and focus as rings inside the element (3px ink for a chosen slot, 2px violet for focus) so clipping never cuts them.
- **Do** keep the confirm action in the sticky summary bar at every width.
- **Do** keep field text at 16px and use tabular figures for people, dates and times.
- **Do** gate hover styles behind `(hover: hover) and (pointer: fine)` and replace press scaling and ring scaling with static states under reduced motion.

### Don't:
- **Don't** use sky colours as decoration or as a background for anything that is not a time.
- **Don't** introduce a second action colour; amber and red mean scarcity and error only.
- **Don't** warm the ground toward cream or paper; the ground is cool lilac-grey.
- **Don't** add drop shadows or lift to surfaces; the selected slot is marked by its ring, not by rising.
- **Don't** split the sky band into separated tiles; its cells touch inside one rounded band.
- **Don't** depend on the restaurant logo; the name appears in text (footer, copy) and the owner may replace or remove the mark.
- **Don't** borrow the panel world's mint, warm ground, Nunito or `panel-` components on booking surfaces.
