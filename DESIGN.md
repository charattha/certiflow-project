---
name: Marriott Marquis Bangkok Queen's Park — CertiFlow
description: The property's internal HR console as a modern hotel operating standard — red, black, and grey, drawn from the real Marriott Marquis Bangkok Queen's Park lockup.
colors:
  ink: "#1B1B1D"
  ink-soft: "#6B6B70"
  paper: "#F5F5F6"
  sheet: "#FFFFFF"
  sheet-alt: "#F8F8F9"
  rule: "#E4E4E7"
  rule-strong: "#D0D0D5"
  red: "#9A1B32"
  red-dark: "#6E1224"
  red-bright: "#C41230"
  binding: "#141416"
  binding-soft: "#26262A"
  status-pending: "#B45309"
  status-interview: "#2563EB"
  status-approved: "#15803D"
  status-completed: "#7C3AED"
  status-rejected: "#52525B"
typography:
  display:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
  figure:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  head:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  body:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  small:
    fontFamily: "Inter, 'Noto Sans Thai', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.red-dark}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 17px"
  status-seal:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Marriott Marquis Bangkok Queen's Park — CertiFlow

<!-- Second implementation of the visual world (was "The Concierge Ledger": ivory/brass,
     Cinzel-engraved antique register). Replaced at the user's explicit direction to move
     to a modern identity in the property's real red/black/grey, built from the supplied
     Marriott Marquis Bangkok Queen's Park lockup (IMG_5609). The real lockup image ships at
     public/marriott-marquis-logo.png and is used everywhere it sits on a light surface (the
     login screen). Its wordmark is printed in black, so it can't sit on the dark nav band —
     there, src/components/MarriottLogo.tsx falls back to a redrawn "M" mark + CertiFlow
     wordmark that can recolor for the dark background and favicon scale. -->

## Overview

**Creative North Star: "The House Standard"**

CertiFlow is the property's internal HR console, so it earns the visual authority of the
document every department already trusts: the hotel's own operating standard — the crisp,
red-tabbed binder that tells staff exactly how the house runs. Not a public marketing surface,
not a warm heritage artifact: a clean, confident, corporate tool that happens to be printed in
the property's own colors, because it belongs to the property.

The interface refuses two ruts: the generic blue-accent SaaS dashboard that could belong to any
company, and the previous world's antique-ledger romance (ivory paper, engraved serif, brass
hairlines), which read as a costume rather than the actual brand. Red is the one color this
system spends deliberately — on primary actions, the active nav mark, and the brand lockup —
never on status, so it stays legible as "this is the property," not "this failed."

**Key Characteristics:**
- White and light-grey surfaces, near-black text and navigation, one maroon-red accent held in reserve for brand and primary action.
- A single modern sans (Inter, paired with Noto Sans Thai) carries every role — no serif, no engraved caps.
- Soft, confident corners (8px controls, 12px cards) — considered, not sharp, not bubbly.
- Flat, quiet elevation: a soft neutral shadow lifts cards off the grey canvas; nothing glows.
- The real Marriott Marquis Bangkok Queen's Park lockup anchors the login screen; a compact mark + wordmark rides the nav on every other screen.

## Colors

A restrained neutral palette — white, near-black, and warm grey — with one maroon-red accent carried at page scale only where the property's brand or a primary action lives.

### Primary
- **Marriott Red** (#9A1B32): the property's brand color and the system's one accent — primary buttons, the active nav underline, the login lockup, focus rings, and the CertiFlow "M" mark. Nowhere else.
- **Red Dark** (#6E1224): hover/active state for red-filled controls.
- **Red Bright** (#C41230): reserved for large, bright brand moments (the lockup's boxed "MARQUIS" and the mobile nav's active label) — never small body text.

### Neutral
- **Ink** (#1B1B1D): primary text and the nav/binding band — a true near-black, not the previous world's warm sepia.
- **Ink Soft** (#6B6B70): secondary text, captions, and meta — a neutral grey, deliberately not tinted warm; this is a corporate tool, not a paper artifact.
- **Paper** (#F5F5F6): the page canvas.
- **Sheet** (#FFFFFF) / **Sheet Alt** (#F8F8F9): card surfaces and alternating row tint.
- **Rule** (#E4E4E7) / **Rule Strong** (#D0D0D5): hairline borders and section dividers.
- **Binding** (#141416) / **Binding Soft** (#26262A): the top navigation band and its mobile submenu.

### Status seals (labeled beyond color)
- **Pending** (#B45309, amber) · **Interview** (#2563EB, blue) · **Approved / Active**
  (#15803D, green) · **Completed (role seal)** (#7C3AED, violet) · **Rejected / declined**
  (#52525B, neutral charcoal — deliberately not red).

### Named Rules
**The One Red Rule.** Red means "this property" or "do this now" — brand and primary action
only. Status, error, and destructive states use their own hues (amber/blue/green/violet/charcoal),
never red, so a red element is never mistaken for a warning.
**The Flat-Grey Rule.** Secondary text and dividers are neutral grey, not warm-tinted. This is a
corporate standard, not a heritage document — warmth would pull it back toward the discarded
antique world.

## Typography

**Display / Body / Label Font:** Inter (with Noto Sans Thai for Thai) — one sans family for
every role, no serif anywhere in this world.

**Character:** a single clean geometric-leaning sans, set with confident weight steps (700 for
figures and titles, 600 for heads and labels, 400 for body) rather than a second typeface, so the
system reads as one voice at every scale. Thai and English share the same sans treatment.

### Hierarchy
- **Display** (700, clamp 1.6–2.2rem, -0.01em): page titles ("Role Center").
- **Title** (600, 1.125rem): sub-titles, modal headings, emphasized entries.
- **Figure** (700, clamp 1.9–2.6rem, tabular, -0.02em): stat-strip totals.
- **Head** (600, 0.72rem, 0.14em tracking, caps): table/column heads and section labels.
- **Body** (400, 0.875rem, 1.5): all data, controls, and prose.
- **Label** (600, 0.6875rem, 0.08em): status seals, tags, meta.
- **Small** (400, 0.8125rem): pagination, inline meta.

### Named Rules
**The One-Voice Rule.** Every role is Inter. Hierarchy comes from weight and size, never from
switching typefaces — the discipline that keeps a red-and-black system from feeling loud.

## Layout

Unchanged from the established app shell: a centered content column (max-width 1180px) on the
paper canvas, built from stacked sections with the 8px spacing scale (xs4/sm8/md16/lg24/xl40/xxl64).
Content lives on white sheets with visible hairline borders; a stat strip of totals sits above
the main register/table on dashboard views. Responsive behavior (stat strip to 2×2 block, table
to stacked cards below ~768px) is preserved from the prior implementation.

## Elevation & Depth

Flat by default, with a single soft neutral shadow lifting sheets off the grey canvas — no warm
tint, no colored glow. Overlays (modals) use a deeper version of the same neutral shadow.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 2px 0 rgba(20,20,22,0.04), 0 6px 20px -8px rgba(20,20,22,0.10)`):
  cards, tables, panels at rest.
- **Overlay** (`box-shadow: 0 24px 60px -20px rgba(20,20,22,0.35)`): modals.

### Named Rules
**The No-Glow Rule.** Shadows are neutral black at low opacity. A colored or zero-offset shadow
reads as decoration, not depth.

## Shapes

Considered softness, not sharpness: cards, modals, and their table containers take a 12px
radius (`rounded-xl`); inputs and buttons take 8px (`rounded-lg`). Borders are 1px hairlines in
`rule`; a table header or totals row carries a 2px `rule-strong` underline. This is a deliberate
move away from the prior world's near-zero "ledger" radius — softness is part of what makes the
system read as modern rather than archival.

## Components

### Buttons
- **Shape:** 8px radius.
- **Primary:** red fill (#9A1B32), white text, 12px/18px padding, 0.08em uppercase label.
- **Hover:** deepens to Red Dark (#6E1224).
- **Secondary:** white sheet, 1px `rule` border, ink text; hover border deepens to `rule-strong`.
- **Focus:** red border plus a 2px red inset underline; no glow ring.

### Cards / Containers
- **Corner:** 12px radius, clipped (`overflow-hidden`) so tables and headers inherit it.
- **Background:** white sheet on the grey paper canvas.
- **Shadow:** Sheet (see Elevation).
- **Border:** 1px `rule` hairline.

### Inputs / Fields
- **Style:** white sheet, 1px `rule` border, 8px radius.
- **Focus:** border → red, plus a 2px red inset underline (no glow).
- **Error:** charcoal/status-rejected border and helper text naming the fix.

### Navigation (the Binding)
- A near-black band (#141416), 52px, sticky, 2px red hairline along its bottom edge. The
  CertiFlow wordmark + Marriott Marquis mark sit left (compact lockup), route links center in
  Label caps with a red underline on the active route, user identity + sign-out right. Mobile:
  links collapse into a near-black submenu; active links read in Red Bright.

### Status Seal
- A 6px status dot + the status word in Label caps. Color is never the only signal — the word is
  always present. Rejected/declined uses neutral charcoal, never red (The One Red Rule).

### Brand Lockup (signature)
- The login screen shows the real property lockup image (public/marriott-marquis-logo.png) at
  full fidelity — the one place the ceremony of the actual logo appears. Every other screen
  (the dark nav band, favicon) uses the redrawn compact mark + CertiFlow wordmark pairing,
  since the real asset's black wordmark can't sit on a dark surface.

## Do's and Don'ts

### Do:
- **Do** hold red to brand and primary action only (The One Red Rule).
- **Do** keep every role in Inter; build hierarchy with weight and size (The One-Voice Rule).
- **Do** use neutral-grey secondary text and neutral shadows, never warm-tinted (The Flat-Grey
  Rule, The No-Glow Rule).
- **Do** label every status with its word, not color alone.
- **Do** show the full brand lockup once (login) and the compact mark elsewhere.

### Don't:
- **Don't** reintroduce a serif or engraved caps treatment — that is the discarded world.
- **Don't** use red for status, error, or destructive actions — give those their own hue.
- **Don't** ship a sharp near-zero radius on cards/controls — this world is deliberately softer
  than its predecessor.
- **Don't** tint secondary text or shadows warm; this is a corporate standard, not a heritage
  artifact.
