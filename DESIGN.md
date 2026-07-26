---
name: Marriott Marquis Bangkok Recruiting
description: The recruiting console as a grand-hotel guest ledger — ruled, engraved, brass on ivory.
colors:
  ink: "#211C14"
  ink-soft: "#5C5342"
  paper: "#F1EADB"
  sheet: "#FBF8F0"
  sheet-alt: "#F5EFE1"
  rule: "#DED3BC"
  rule-strong: "#C7B996"
  brass: "#8A6D1F"
  brass-bright: "#C9A84C"
  binding: "#241D16"
  binding-soft: "#3A2F24"
  status-pending: "#8A6410"
  status-interview: "#2C5578"
  status-approved: "#3E6B4A"
  status-completed: "#6A4B86"
  status-rejected: "#9B3B36"
  emboss-light: "rgba(255,255,255,0.55)"
  emboss-dark: "rgba(0,0,0,0.45)"
typography:
  crest:
    fontFamily: "Cinzel, 'Noto Serif Thai', Georgia, serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.16em"
  display:
    fontFamily: "Spectral, 'Noto Serif Thai', Georgia, serif"
    fontSize: "clamp(1.6rem, 3vw, 2.2rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Spectral, 'Noto Serif Thai', Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(1.9rem, 4vw, 2.6rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  head:
    fontFamily: "Spectral, 'Noto Serif Thai', Georgia, serif"
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
  none: "0px"
  sm: "2px"
  md: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    padding: "9px 18px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 17px"
  status-seal:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Marriott Marquis Bangkok Recruiting

<!-- First implementation of a replacement world (was Microsoft FluentUI). Tokens below are
     committed by the Dashboard/Role Center build; re-run /impeccable document to re-scan after
     the world rolls out to the remaining pages. Brand crest + wordmark are LABELED PLACEHOLDERS
     until official Marriott Marquis Bangkok assets are supplied. -->

## Overview

**Creative North Star: "The Concierge Ledger"**

The recruiting console is the grand hotel's guest ledger — the leather-bound register a
front desk keeps of everyone who passes through. Recruitment *is* a check-in: a candidate
signs the register, is entered as a ruled line, and is advanced through the house until a
decision. The interface refuses the two ruts this category ships: the generic SaaS dashboard
(sidebar, KPI cards, blue accent) and the dark-gold "luxury" glamour skin. Instead it is
literally a page of a ledger — warm ivory stock, hairline ruling, engraved heads, brass
structure, and figures set like column totals at the head of the sheet.

The register is a working document, not a museum piece. Ruling and engraving are *structure*
that speeds scanning, never ornament laid over a SaaS table. It is bilingual by birthright —
hotel ledgers were always kept in two scripts — so Thai and English are set with equal care,
serif paired with serif, sans with sans.

**Key Characteristics:**
- Warm ivory paper ground; ink text; a single brass accent held in reserve.
- Everything is ruled: hairlines, not boxes; totals, not cards.
- Engraved serif heads (Cinzel/Spectral) over a workhorse data sans (Inter / Noto Sans Thai).
- Orthogonal and sharp — near-zero radius; the page is a sheet, not a bubble.
- Flat by default; depth is the sheet lifting off the desk, not drop-shadowed cards.

## Colors

A warm ivory-and-ink ledger palette with one brass voice and five ink-drawn status seals.

### Primary
- **Brass** (#8A6D1F): the single structural accent — primary buttons, active tab underline,
  the gilt hairline on the binding, head rules. Deep enough to read as text on ivory.
- **Brass Bright** (#C9A84C): the luminous Marriott gold, reserved for *large* edges, the
  active rail, and focus rings. Never used for small text (fails contrast on ivory).

### Neutral
- **Ink** (#211C14): primary text — a warm near-black, the fountain-pen line.
- **Ink Soft** (#5C5342): secondary text and captions — a warm taupe tinted from the ground,
  never a cold gray.
- **Paper** (#F1EADB): the desk/canvas the sheets rest on.
- **Sheet** (#FBF8F0): the ledger page surface where data lives.
- **Sheet Alt** (#F5EFE1): alternating row tint for scan rhythm.
- **Rule** (#DED3BC) / **Rule Strong** (#C7B996): hairline ruling and section rules.
- **Binding** (#241D16): the leather spine — the top navigation band; ivory text sits on it.
- **Emboss Light / Dark** (rgba white 0.55 / black 0.45): a 1px letterpress *highlight*
  on ivory display heads and figures, and an engrave *shadow* on the dark binding crest —
  the world's tactile devices, applied as `text-shadow`, never as fills.

### Status seals (labeled beyond color)
- **Pending** (#8A6410, ochre) · **Interview** (#2C5578, ink blue) · **Approved / Hired / Active**
  (#3E6B4A, ledger green) · **Completed** (#6A4B86, violet seal) · **Not proceeding / Rejected**
  (#9B3B36, oxblood).

### Named Rules
**The One Brass Rule.** Brass carries structure and a single action per view. If a screen has
two brass buttons competing, one is wrong. Its scarcity is what makes the ledger feel valuable.
**The Ink-Never-Gray Rule.** Secondary text tints from the paper's warmth (Ink Soft), never a
neutral gray. A cold gray on this ground reads as a different, cheaper document.

## Typography

**Crest Font:** Cinzel (inscriptional Roman caps) — the property wordmark/crest only.
**Display / Serif Font:** Spectral (with Noto Serif Thai for Thai) — page titles, ledger names,
column totals, ruled heads.
**Body / Data Font:** Inter (with Noto Sans Thai for Thai) — all data, controls, and UI text;
tabular figures for aligned numerals.

**Character:** an engraver's serif over a clean operational sans — the plate on the desk and the
clerk's hand in the columns. Thai is set serif-with-serif and sans-with-sans so neither script
feels bolted on.

### Hierarchy
- **Crest** (600, 0.95rem, 0.16em tracking, caps): the property nameplate on the binding.
- **Display** (500, clamp 1.6–2.2rem): page title ("Role Center").
- **Title** (600, 1.125rem): sub-titles, empty-state headings, and emphasized entry
  names on stacked mobile slips — a serif step between Display and Body.
- **Figure** (600, clamp 1.9–2.6rem, tabular): the balance-strip totals.
- **Head** (600, 0.72rem, 0.14em tracking, small-caps feel): ruled column/section heads.
- **Body** (400, 0.875rem, 1.5): ledger entries and controls; measure capped ~70ch in prose.
- **Label** (600, 0.6875rem, 0.08em): status seals, line numbers, meta.
- **Small** (400, 0.8125rem): control + meta text — position tags, inline status
  selects, pagination info, and contact lines on register rows.

### Named Rules
**The Serif-Heads Rule.** Every head and every figure is serif; every datum and control is sans.
The eye learns the register in one glance.

## Layout

A single centered ledger spread, max-width 1180px, resting on the paper canvas. The page is
built from **ruled bands**, not cards: a binding nav, a page title row, a ruled balance strip
of totals, then the register (the entries table). Vertical rhythm is one 8px scale
(xs4 / sm8 / md16 / lg24 / xl40 / xxl64) with more space above a head than below it. Data density
is high — this is a work tool — but every group is separated by a hairline, not a gap alone.
Responsive: below ~720px the spread collapses; the balance strip becomes a 2×2 total block and
each register row restates as a stacked ledger slip (label:value pairs) so nothing is lost.

## Elevation & Depth

Flat by default. Depth is conveyed by ruling and paper tint, not by floating cards. The one
physical metaphor is a **sheet resting on a desk**: a single soft, warm shadow lifts the sheet
off the canvas. Overlays (modals, menus) deepen it. Never a zero-offset colored halo.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 10px 28px -18px rgba(36,29,22,0.30)`):
  the ledger page on the desk.
- **Overlay** (`box-shadow: 0 24px 60px -20px rgba(36,29,22,0.45)`): menus, modals.

### Named Rules
**The No-Float Rule.** Data never sits in its own drop-shadowed card. If it needs separation,
rule it. Shadow belongs to the whole sheet, never to a row or a stat.

## Shapes

Orthogonal and ruled. Corners are sharp (0px) on the sheet, rules, and table; controls take a
hair of softening (sm 2px, md 3px) so they read as pressed brass, not rounded pills. Borders are
hairlines (1px `rule`); a head or total carries a 1.5–2px `rule-strong` or brass rule beneath it.
The ledger's structural left margin rule (a thin brass/rule double line down the sheet edge) is a
world-native device, not a decorative colored border.

## Components

### Buttons
- **Shape:** near-square (2px radius).
- **Primary:** brass fill (#8A6D1F), ivory text (#FBF8F0), 9px/18px padding, label in 0.08em caps.
- **Secondary:** ivory sheet, 1px brass hairline, ink text.
- **Hover / Focus:** primary deepens toward #6B560E and lifts 1px; focus shows a 2px brass-bright
  ring offset from the control. Ghost = ink text, no fill, brass underline on hover.

### Tabs / Track rail
- Text tabs (Full-time / Internship) in Head style; the active tab carries a **brass underline
  bar** that slides between tabs. Switching tracks turns the register page (see signature).

### Cards / Containers → Sheets
- **There are no cards.** Content lives on one **sheet**: ivory (#FBF8F0), sharp corners, the
  Sheet shadow, an inset hairline (1px `rule`). Internal padding lg (24px).

### Inputs / Fields
- Ivory sheet, 1px `rule` border, 2px radius, ink text. **Focus:** border → brass and a brass
  underline thickens; no glow. Error: oxblood border + oxblood helper text naming the fix.

### Navigation (the Binding)
- A dark leather band (#241D16), 52px, sticky, with a **gilt hairline** (brass) along its bottom
  edge. Crest wordmark left (Cinzel, ivory), track/section links center in Label caps with a brass
  underline on the active route, user register (name + role) right. Mobile: links collapse behind
  a ledger-tab menu; the crest and user remain.

### Status Seal (signature)
- A small stamped chip: a 6px status **dot** + the status word in Label caps, on a faint tint of
  its own hue with a 1px tint border. Color is never the only signal — the word is always present.

### Balance Strip (signature)
- The dashboard totals set as a **ruled ledger balance**, not KPI cards: one horizontal band on
  the sheet, divided by vertical hairlines into columns; each column is a Head label over a serif
  **Figure**, with a status dot. It reads like the totals penned at the head of a ledger page.

### The Register (signature)
- The entries table: a **line-number margin**, ruled hairline rows, alternating Sheet Alt tint,
  serif names, tabular dates stamped in Ink Soft, a Status Seal in the final column. Head row is
  Head style with a `rule-strong` underline. Empty and loading states stay in-world (a ruled,
  empty sheet that says the register is empty; a quiet ruling-in shimmer, not a spinner).

## Do's and Don'ts

### Do:
- **Do** rule content into bands; use the single **Sheet** as the only container.
- **Do** keep every head and figure serif, every datum and control sans (The Serif-Heads Rule).
- **Do** hold brass to one action per view (The One Brass Rule) and tint secondary text warm
  (The Ink-Never-Gray Rule).
- **Do** label every status with its word, not color alone.
- **Do** author one orchestrated motion (the register ruling in / the page turning on track
  switch) and honor `prefers-reduced-motion`.

### Don't:
- **Don't** ship KPI stat-cards, a left sidebar, or a blue accent — that is the SaaS rut.
- **Don't** ship the dark-gold-glow "luxury" skin — that is the opposite rut.
- **Don't** put a drop shadow on a row, stat, or seal (The No-Float Rule).
- **Don't** use a colored `border-left`/`right` above 1px as decoration on rows or callouts
  (the sheet's structural margin rule is the only sanctioned vertical color rule).
- **Don't** use gray for secondary text, or brass-bright for small text.
