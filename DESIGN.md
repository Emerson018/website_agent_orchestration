---
name: Aether
description: Custom sites for local businesses, presented as a bone-white point mesh lit on a near-black field.
colors:
  void: "#050507"
  void-raised: "#0b0a10"
  bone: "#ecebe6"
  bone-muted: "#a3a1a8"
  bone-faint: "#8a8891"
  signal: "#ef4444"
  signal-hover: "#f25e5e"
  violet: "#1b004b"
  line: "rgb(236 235 230 / 0.12)"
  line-strong: "rgb(236 235 230 / 0.24)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.6rem, 5vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1.02
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.025em"
  wordmark:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  none: "0px"
  full: "9999px"
spacing:
  gutter-mobile: "20px"
  gutter-tablet: "32px"
  gutter-desktop: "48px"
  section-mobile: "96px"
  section-desktop: "128px"
  container: "1400px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.void}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-outline-pill:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  link-quiet:
    textColor: "{colors.bone-muted}"
    typography: "{typography.body-small}"
  link-quiet-hover:
    textColor: "{colors.bone}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "8px 0"
  form-slab:
    backgroundColor: "rgb(5 5 7 / 0.85)"
    rounded: "{rounded.none}"
    padding: "24px 28px"
  work-frame:
    backgroundColor: "{colors.void-raised}"
    rounded: "{rounded.none}"
---

# Design System: Aether

## Overview

**Creative North Star: "The Lit Mesh"**

Aether is a dark, open field where light marks what matters. The ground is near-black, the ink is a warm bone white, and the only saturated color is a signal red that appears where the visitor can act. Everything else is quiet: a bone serif for statements, a clean sans for explanation, and 1px hairlines doing the work that cards and shadows do elsewhere.

The world comes from the "Ecos de Luz" hero, a point-graph sculpture of a hand touching a face that brightens under the pointer. The page borrows its materials directly: bone points and filaments become hairlines and text, the red awakened points become the action color, the deep violet glow becomes a radial depth field behind a few sections. Sections are open fields separated by a hairline, never boxed. Density is low; whitespace and large serif headlines carry the pace.

Motion is nearly absent by design. The first-viewport copy rises once out of the dark; the sculpture itself responds to the pointer; nothing else animates beyond color transitions on hover.

**Key Characteristics:**
- Near-black ground, bone ink, one red for action and focus.
- Cormorant Garamond display over Plus Jakarta Sans text.
- Hairline rules instead of cards, glass or shadows; square frames, pill-shaped actions.
- Violet only as a soft radial field, never as a fill or text color.
- One entrance animation, fully neutralized under reduced motion.

## Colors

A near-monochrome dark palette of void and bone, with one hot red and one deep violet borrowed from the sculpture's light.

### Primary
- **Signal Red** (signal): the action color. Primary button fills, the header CTA's hover border and text, the footer WhatsApp link hover, the focus-visible outline, the input caret and focused underline, text selection, error messages, the success check ring, and the single "awakened" point on the step rail. Hover deepens to **Lit Signal** (signal-hover), a slightly lighter red.

### Secondary
- **Deep Aether Violet** (violet): exists only inside radial gradients (at 0.75 and 0.9 alpha, fading to transparent by 70-72%) behind Diferenciais and Fechamento, and as the sculpture's second glow color. It is depth, not a color you read.

### Neutral
- **Void** (void): page, body and theme-color background; the text color on red buttons; the base of every darkening gradient over the hero.
- **Raised Void** (void-raised): the backing plate behind work screenshots, visible only while images load or letterbox.
- **Bone** (bone): headlines, primary text, the wordmark, active labels, nav hover.
- **Muted Bone** (bone-muted): subcopy, body paragraphs, field labels at rest, quiet links at rest.
- **Faint Bone** (bone-faint): placeholders, "(opcional)" hints, the copyright line, minor annotations.
- **Hairline** (line): section dividers, the form slab frame, list dividers, screenshot frames.
- **Strong Hairline** (line-strong): input underlines at rest, the outline pill border, the step-rail connector, underline decoration on text buttons.

### Named Rules
**The One Red Rule.** Signal red marks only what you can do or where you are: actions, focus, caret, selection, errors, and the awakened point. It never colors a headline, an accent word, or decoration.

**The Field Not Fill Rule.** Violet is applied only as a radial gradient fading into void behind an open section. Never a solid background, border, or text color.

## Typography

**Display Font:** Cormorant Garamond (with Georgia, serif), loaded at 500, 600 and 500 italic
**Body Font:** Plus Jakarta Sans (with system-ui, -apple-system, sans-serif), loaded at 400-700

**Character:** A high-contrast, literary serif set large and tight against a modern geometric sans. The serif speaks; the sans explains.

### Hierarchy
- **Display** (500, clamp(2.6rem, 5vw, 4.5rem), 0.95, -0.015em): the single h1 in the first viewport, max ~34rem wide, balanced wrapping.
- **Headline** (500, clamp(2.25rem, 4.4vw, 3.75rem), 1.02): section h2s, constrained to 14-18ch so they break into stacked lines.
- **Title** (500, 1.5-1.75rem, 1.0-1.25): step titles (1.65rem), definition terms and work names (1.5rem), the form heading (1.5rem, 1.75rem from sm).
- **Body** (400, 15px, 1.625): section paragraphs, max 34ch in step columns. The first-viewport subcopy steps up to 16px / 17px from sm.
- **Body small** (400-600, 14px): links, buttons, captions, footer text.
- **Label** (500, 12px, 0.025em tracking, sentence case): form field labels and the inline note beside the form heading.

### Named Rules
**The Bone Italic Rule.** Emphasis inside a serif headline is Cormorant italic in bone, the same color as the line (the "aceso" accent). Never red, never a different weight jump.

**The Serif Speaks Rule.** h1-h3, definition terms, work names and the wordmark are Cormorant at 500 with balanced wrapping; all explanation, labels and actions are Plus Jakarta Sans.

## Layout

A single 1400px centered container with gutters of 20px, 32px from sm (640px) and 48px from lg (1024px). Sections are full-bleed bands separated by a 1px top hairline, with vertical padding of 96px, 128px from sm.

The first viewport is a full-height (100svh) band. On desktop the hero canvas fills it and the copy sits in a left column (max 34rem), vertically centered; a left-to-right void gradient (void at 0%, 0.9 alpha at 34%, clear by 70%) keeps the text side readable while leaving the sculpture on the right interactive. On phones the canvas occupies the top 50svh, centered, fading to void downward, and the copy starts at 46svh, anchored to the bottom. A top fade (112px) keeps the header clear of the art.

Content patterns in use: a three-column step rail from md (stacked with a vertical rail below); a 5fr/7fr split from lg with a hairline-divided definition list (2fr/3fr inside from sm); a three-column screenshot grid from md (32px column gap, 48px row gap). Breakpoints are Tailwind defaults: sm 640px, md 768px, lg 1024px.

### Named Rules
**The Clear Art Rule.** Art never sits behind text. In Fechamento the sculpture image is a band above the copy on phones (288px, 384px from sm, masked to fade downward) and an absolutely positioned 52% panel on the right on desktop, masked to fade leftward. The hero uses directional void gradients to the same end.

## Elevation & Depth

Flat. There are no drop shadows. Depth comes from three things only: void gradients over the hero canvas, radial violet fields behind open sections, and the luminous sculpture itself (screen-blended at 0.7 opacity when shown as a still in Fechamento). The form slab separates from the art by a translucent void fill (0.85 alpha) and a hairline frame, not by elevation.

### Shadow Vocabulary
- **Signal halo** (`box-shadow: 0 0 0 4px rgb(239 68 68 / 0.18)`): the awakened (third) point on the step rail. A glow ring, not a lift.
- **Underline thickener** (`box-shadow: 0 1px 0 0 var(--color-signal)`): doubles a focused input's underline to 2px.

### Named Rules
**The Hairline Not Shadow Rule.** Separation is a 1px bone line at 12% or 24% alpha. If a surface seems to need a shadow, give it a hairline frame instead.

## Shapes

Two shapes only. Frames are square (0px): the form slab, inputs, screenshot frames, section bands. Actions and points are fully round (9999px): primary buttons, the outline pill CTA, the success check ring, the step-rail dots (11px). Borders are always 1px hairlines.

## Components

### Buttons
Confident and soft-edged, the only round things besides the light points.
- **Shape:** full pill (9999px).
- **Primary:** signal fill, void text, 14px semibold, 12px 24px padding, 8px gap to a 16px trailing arrow icon. Used for "Quero a minha proposta" in the form and in Fechamento.
- **Hover / Focus:** fill shifts to signal-hover via a color transition; the in-form arrow nudges 2px right. Focus-visible draws the global 2px signal outline at 3px offset. Disabled while submitting: 0.7 opacity, wait cursor, spinning loader icon.
- **Outline pill:** the header's "Pedir proposta": transparent, strong-hairline border, bone 14px medium text, 8px 16px padding; on hover the border and text turn signal.
- **Quiet link:** the WhatsApp secondary action: muted-bone 14px text with a 16px chat icon, brightening to bone on hover. Always sits beside a primary, never alone as the main action.

### Cards / Containers
There are no cards. The one framed container is the **form slab**: square corners, 1px hairline border, void at 0.85 alpha, 24px padding (28px horizontal from sm). Screenshot frames are square, hairline-bordered, on raised void, 16:10, cropped from the top.

### Inputs / Fields
- **Style:** underline only. No box, no radius, no horizontal padding; a strong-hairline bottom border, transparent background, 15px bone text, faint-bone placeholder, signal caret.
- **Focus:** the underline turns signal and thickens to 2px (border plus 1px shadow); the label above brightens from muted bone to bone. The default outline is suppressed on inputs only because this underline replaces it.
- **Error:** a single message below the fields in 14px signal text (role alert); when the send itself fails it adds an underlined bone "Abrir o WhatsApp" link.
- **Labels:** 12px medium, 0.025em tracking, muted bone, 6px above the field; optional hints in faint bone.

### Navigation
An absolutely positioned 80px header over the hero: the Cormorant wordmark on the left; on the right, two 14px muted-bone anchor links (hidden below md) that brighten to bone on hover, then the outline pill CTA. The footer mirrors it below a hairline: wordmark at 1.875rem with a one-line muted description, and the WhatsApp number in bone turning signal on hover.

### Step Rail
Three steps on a 1px strong-hairline connector (horizontal from md, vertical on phones), each marked by an 11px round point: bone for the first two, signal with the halo for the last. It repeats the sculpture's grammar of points joined by filaments, with the final point awakened.

### Ecos de Luz Canvas
The signature surface: an interactive GSAP point-graph canvas drawn on void, bone/blue-white filaments and points, with signal and violet as its two glow colors. The pointer attracts and lights the mesh. Anchored at 82% across on desktop and centered on phones. Under prefers-reduced-motion it is replaced by the still image at the same anchor.

### Motion
One entrance only: the first-viewport copy uses aether-rise (1.1s, cubic-bezier(0.16, 1, 0.3, 1), from 14px down, transparent and 6px blurred). Everything else is a color transition on hover or focus. A global reduced-motion block collapses all animation and transition durations to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** keep signal red for actions, focus, caret, selection, errors and the awakened point (The One Red Rule).
- **Do** separate sections with a 1px hairline (line) and leave them as open fields inside the 1400px container.
- **Do** set emphasis in a serif headline as bone italic (The Bone Italic Rule).
- **Do** build form fields as underline-only, with a signal underline and a brightened label on focus.
- **Do** place violet only as a radial field fading to transparent behind a section.
- **Do** keep art clear of text: above it on phones, beside it on desktop, or behind a void gradient (The Clear Art Rule).
- **Do** pair every primary pill with at most one quiet link as the secondary action.

### Don't:
- **Don't** use cards, glass panels, or drop shadows to separate content; use hairlines.
- **Don't** color headline words, decoration or large surfaces signal red.
- **Don't** use violet as a solid fill, border, or text color.
- **Don't** round frames, inputs or images; roundness belongs to actions and points.
- **Don't** add entrance animations beyond the single first-viewport rise, and never ship motion without the reduced-motion fallback.
- **Don't** draw boxed inputs or remove the global signal focus outline from anything but underline fields.
