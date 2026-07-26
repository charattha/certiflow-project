---
target: all pages (Login, EmployeeDashboard, AdminDashboard, AdminManagement)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-07-26T09-11-19Z
slug: frontend-src-pages
---
Method: dual-agent (A: a3ea6e8ec704ddedb · B: a1f3dd8a842b7613d)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good spinners/disabled states, but AdminDashboard's trigger-failure path uses a blocking `alert()` instead of inline status |
| 2 | Match Between System and Real World | 2 | "Gatekeeper Management" is a bouncer metaphor for what's actually "review document requests"; CertiPaws/CertiFlow brand break |
| 3 | User Control and Freedom | 2 | Destructive actions have no undo; delete/reset gated only by native `confirm()`, no recovery path |
| 4 | Consistency and Standards | 1 | CertiFlow/CertiPaws naming split; only 1 of 4 screens is bilingual; role badges and status pills use unrelated color families |
| 5 | Error Prevention | 2 | Role-hierarchy gating is correct, but destructive deletes require only an OK-click, no typed confirmation |
| 6 | Recognition Rather Than Recall | 3 | Doc-type cards are self-explanatory, but the reason-select stays hardcoded English even in Thai mode |
| 7 | Flexibility and Efficiency | 1 | No bulk-trigger, no search/filter beyond a role dropdown, no shortcuts, no auto-refresh, in a tool with a described monthly bulk workflow |
| 8 | Aesthetic and Minimalist Design | 2 | Glow shadows, blur orbs, and a decorative low-opacity icon add noise with no informational value |
| 9 | Help Users Recognize/Diagnose/Recover from Errors | 3 | AdminManagement's inline banner is solid; AdminDashboard's `alert()` gives zero diagnostic detail |
| 10 | Help and Documentation | 1 | No tooltips beyond two bare `title` attributes; no in-flow guidance for unfamiliar visa-letter fields |
| **Total** | | **20/40** | **Acceptable (bottom of band)** |

Both heuristics 7 and 10 were scored (not n/a) — this is a daily-use internal Operate-mode tool, not a landing page, so both genuinely apply.

## Design Specificity Verdict

**LLM assessment:** This is a generic dark-SaaS admin template — sidebar, glowing red CTAs, blurred gradient orbs, translucent glass cards — with hotel-HR words dropped into the slots. Nothing in the layout, iconography, or interaction pattern signals "hotel front-desk/HR document tool" over any ticketing or CRM app. The genuine domain-specific work lives in the *data model and copy*: real Thai bilingual field labels for visa letters, Thai-ID-based default-password logic surfaced directly in the UI, and role-hierarchy-aware gating that correctly mirrors the backend's RBAC rules. But all of that is buried under an off-the-shelf shell. More centrally: DESIGN.md commits to a specific, opinionated "Concierge Ledger" direction (ivory/ink/brass, ruled sheets, no sidebar, no cards) and explicitly blacklists exactly what these four screens ship — its own Don't list says "Don't ship KPI stat-cards, a left sidebar, or a blue accent... Don't ship the dark-gold-glow luxury skin." Every file under review does one or both. Zero migration has occurred yet. Worth flagging on its own: DESIGN.md's frontmatter title is "Marriott Marquis Bangkok Recruiting" — a recruiting console, not CertiFlow's document-request workflow — which raises a real question of whether this is the correctly-scoped design doc for this product (see Provocative Questions).

**Deterministic scan:** Clean — 0 findings across all 4 files (exit code 0). The detector's own functioning was verified with a deliberately bad snippet (fed a `bounce-easing`-triggering animation via `--no-config`), which correctly returned 2 findings and exit code 2 — confirming the clean result on the real files is genuine, not a broken invocation. No `.impeccable/config.json` or inline suppression comments exist that could be masking findings. This isn't a contradiction of the LLM review: the detector's ruleset checks narrow mechanical patterns (e.g. animation easing, certain spacing/contrast heuristics) at the AST level — it has no way to catch brand-name inconsistency, DESIGN.md non-compliance, or information-architecture problems, which is exactly the class of issue Assessment A found. Clean detector + heavy LLM findings here means: the code is mechanically fine, the design is not.

**Visual overlays:** Not available. No browser automation tool is exposed in this Claude Code session, so the live-page overlay/injection step was skipped. The frontend dev server is running at `http://localhost:5173/` if you want to look manually — nothing was fabricated in place of this step.

## Overall Impression

Functionally solid, visually generic, and actively out of step with its own committed design direction. The RBAC logic is genuinely well-built and correctly reflected in the UI — that's the real craft in this codebase. But the visual layer (dark theme, red glow, left sidebar, glass cards) is a stock template that DESIGN.md's own Do/Don't list explicitly rejects, and it hasn't touched any of these four screens yet. The single biggest opportunity: fixing the CertiPaws/CertiFlow brand split and starting the DESIGN.md migration from `RootLayout.tsx` (shared chrome, touches every screen at once) would resolve the two P0s and immediately move several heuristic scores.

## What's Working

1. **Real bilingual execution in EmployeeDashboard** — actual Thai copy and per-field Thai labels for visa-letter fields, not a decorative language toggle.
2. **UI reflects RBAC hierarchy correctly, not just the backend** — AdminManagement disables cross-role password reset for General Admin, hides Edit/Delete on Super Admin targets, and omits Super Admin from the creation dropdown. Matches PRODUCT.md's "server-side hierarchy is the source of truth" principle without contradicting it client-side.
3. **Dynamic per-doc-type field rendering** — `TEMPLATE_FIELDS` shows only the fields actually required for the selected document, genuinely mirroring backend logic, even though the resulting form isn't chunked well (see cognitive load).

## Priority Issues

**[P0] Product naming inconsistency (CertiFlow vs. CertiPaws)**
- **Why it matters:** Login screen, sidebar, and the email placeholder all say "CertiPaws" while the browser title and PRODUCT.md say "CertiFlow." Every screen a real employee touches shows a mismatched brand on a tool whose entire purpose is producing legally-relevant documents (bank loans, visas) — this reads as unfinished or untrustworthy at exactly the moment legitimacy matters most.
- **Fix:** Find/replace CertiPaws → CertiFlow across `Login.tsx` and `RootLayout.tsx`; drop the leftover `PawPrint` icon/import.
- **Suggested command:** `/impeccable clarify`

**[P0] Zero migration to the committed DESIGN.md system**
- **Why it matters:** All five files ship the sidebar+card+dark-glow pattern DESIGN.md explicitly forbids. This isn't a stylistic nice-to-have — it's a live product actively contradicting its own already-approved design direction.
- **Fix:** Start with `RootLayout.tsx` (shared chrome affects every screen): replace the sidebar with the Binding top band, replace card grids with ruled bands/Sheets, replace status pills with Status Seals.
- **Suggested command:** `/impeccable shape` (already drafted for AdminDashboard — extend to Login/RootLayout/EmployeeDashboard)

**[P1] Dev credential block shipped in component source**
- **Why it matters:** `Login.tsx` hardcodes three test account emails and a shared password (`password123`), gated only by `import.meta.env.DEV`. Combined with security-testing artifacts visible at repo root (`sqli-results.json`, `test-lockout.js`, `test-sqli.js`), a misconfigured production build define would leak live test credentials to every visitor.
- **Fix:** Move test credentials out of component source entirely (README or seed script), don't rely on a build flag alone to gate them.
- **Suggested command:** `/impeccable harden`

**[P1] Bilingual parity violated on 3 of 4 screens**
- **Why it matters:** PRODUCT.md names bilingual parity a first-class principle, yet Login, AdminDashboard, and AdminManagement are 100% English — and the two admin screens are the ones Thai-first HR staff use daily. Even inside EmployeeDashboard's own request modal, the reason-select stays hardcoded English regardless of the active language.
- **Fix:** Extend the existing `t` translation-object pattern from EmployeeDashboard to the other three screens; localize the reason-select options.
- **Suggested command:** `/impeccable clarify`

**[P2] Destructive/credential flows break out of the app into native browser dialogs**
- **Why it matters:** Delete-user, reset-password, and trigger-failure all use native `confirm()`/`alert()` at the highest-stakes moments, and the resulting one-time temporary password has no copy affordance and vanishes on dismiss with no retrieval path.
- **Fix:** Replace with an in-world modal requiring the admin to type the target's name/email to confirm delete; add a copy-to-clipboard button and persistent display for issued passwords.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Jordan (first-time employee):** Requesting a visa letter for the first time surfaces 8 required fields at once (salary, monthly service charge, total income, departure/return/arrival/first-duty dates) with zero inline help distinguishing them, no tooltips, and a code-level typo (`daparture_date`) hinting these fields haven't been carefully proofed. A first-timer preparing an embassy-facing document gets no guidance and can easily submit wrong data with no in-flow way to catch it.

**Sam (accessibility-dependent):** Icon-only Edit/Delete buttons rely solely on `title` attributes, not `aria-label` or visible text — inconsistent screen-reader support. Status/role chips use very low-opacity colored backgrounds on a dark canvas that likely fall under WCAG AA contrast for low-vision users, even though (to its credit) a text label always accompanies the color.

**Riley (admin under time pressure):** At the monthly bulk-sync workflow PRODUCT.md describes as normal operation, AdminDashboard offers no bulk-select/bulk-trigger — every pending request must be triggered one row at a time, with no status filter, no search, and only manual refresh. This is heuristic 7's score of 1 made concrete, and it will visibly slow down exactly the burst-load scenario the product exists to handle.

## Minor Observations

- Decorative `PawPrint` icon on Login is a leftover of the wrong brand, adds no value.
- `alert()` used for one error path (AdminDashboard trigger failure) while every other error path uses an inline banner — inconsistent error-UX pattern within the same app.
- `window.location.pathname` used directly for nav highlighting instead of `useLocation()` — works but is a smell under client-side routing.
- Loading state differs between near-identical tables: plain "Loading..." text row vs. spinner-only, no shared component.
- `BulkUpload` sits in the same column as a static "System Policies" text block with no visual separation beyond spacing — mixes an action tool with reference copy.

## Questions to Consider

1. If DESIGN.md's own title is "Marriott Marquis Bangkok Recruiting," is this actually the right design system for CertiFlow's document-request workflow, or a copy-pasted artifact nobody re-validated against this product?
2. During a monthly bulk-sync where dozens of employees get password resets, the UI only ever shows one plaintext temporary password at a time in a dismissible, uncopiable banner — has this workflow ever been traced end-to-end for more than a handful of users?
3. PRODUCT.md names the audit-logged administrative layer as the product's core differentiator, yet no screen in AdminManagement lets an admin view that audit log — why is the tool's own stated differentiator invisible in its own UI?
