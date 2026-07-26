---
target: all pages (Login, EmployeeDashboard, AdminDashboard, AdminManagement) - re-critique after DESIGN.md migration
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-07-26T09-58-49Z
slug: frontend-src-pages
---
Method: dual-agent (A: a681655ea9b7510da · B: a7c6c7c603ed8a1e7)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good per-action feedback; no batch/bulk-trigger progress |
| 2 | Match Between System and Real World | 2 | Ledger metaphor fits, but bilingual coverage still doesn't match a bilingual staff/admin base |
| 3 | User Control and Freedom | 2 | No undo; delete/reset still gated only by native `confirm()`, no typed confirmation |
| 4 | Consistency and Standards | 1 | 3 screens still 100% English; Serif-Heads Rule applied nowhere; 3 brand names now live in the codebase (CertiFlow/CertiPaws/hireflow) |
| 5 | Error Prevention | 2 | Form validation solid; irreversible delete still has no typed-confirm despite "CRITICAL" copy |
| 6 | Recognition Rather Than Recall | 3 | Status seals correctly labeled with word+dot; consistent iconography |
| 7 | Flexibility and Efficiency | 1 | Still no bulk-trigger/search on the Requests register |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained one-accent system where followed, undercut by typographic drift and dead mobile layout |
| 9 | Error Recovery Help | 2 | Inline errors work on Login/password-change; AdminDashboard trigger failure still falls back to `alert()` |
| 10 | Help and Documentation | 1 | Still no help text/tooltips for a 5-doc-type bilingual self-service flow |
| **Total** | | **20/40** | **Acceptable, numerically identical to the pre-migration score** |

## Design Specificity Verdict

**LLM:** The migration is real: no leftover rounded/shadow/dark-glow classes anywhere, brass/ivory/ink tokens used correctly, Cinzel/Spectral in the right roles. But it stopped at the color-and-container layer: DESIGN.md's own Serif-Heads Rule (one of its two named rules) is violated system-wide (every balance-strip label and table header is sans, not serif), the documented mobile "stacked ledger slip" / 2x2 balance behavior was never built, and the brand-name split wasn't actually fixed, just hidden behind a DEV flag. A more authentic skin, offset by newly-visible structural gaps.

**Deterministic scan:** Exit 2 this time, one finding: `overused-font` on Inter (index.html:11). Assessment B did its own role analysis and flagged this as a likely false positive: Inter is scoped only to the `data` font-family token (tabular/numeric use), not the primary UI face; Prompt/Cinzel/Spectral carry the actual personality. Zero findings across all 6 component files. Also specifically grepped for the dynamic-Tailwind-class bug from last round (`text-${color}`-style interpolation) — none found, and noted `AdminManagement.tsx:161-162` carries an explicit comment documenting that exact anti-pattern was deliberately avoided.

**Visual overlays:** Still unavailable, no browser tool in this session.

## Overall Impression

Score is flat at 20/40. Real gains in aesthetic coherence and recognition were exactly offset by consistency and flexibility losses under closer scrutiny. The headline finding: the P0 asked to be fixed wasn't fixed. The dev-credential/brand-split issue is still there, just relocated: Login.tsx still ships real working seed credentials (super@certipaws.com / admin123, confirmed against backend/prisma/seed.ts) directly under a "CertiFlow" wordmark. "Restyle the branding" was treated as satisfied by fixing UI copy, but the actual seed data (and the dev-login helper that must stay accurate to it) is still CertiPaws-branded, a backend/seed-level fix that fell through the crack between two tickets.

## What's Working

1. Input focus treatment (`focus:border-brass` + inset underline) implemented identically and correctly everywhere it was touched.
2. `roleSeal()` in AdminManagement.tsx deliberately avoids the interpolated-Tailwind-class bug with a documenting comment; the JIT-safety lesson from the previous pass stuck.
3. EmployeeDashboard's bilingual `labelTH`/`label` pattern goes further than the reason-select fix originally claimed, a genuine unclaimed improvement.

## Priority Issues

**[P0] Dev credential block still exposes real, working, wrong-branded seed credentials.**
- **Why it matters:** Login.tsx shows super@certipaws.com / admin@certipaws.com / somchai@certipaws.com + admin123, verified against the real seed script, behind only a build flag. Re-opens the exact brand-split issue the last round claimed to close, at the point where a first-timer's trust is most fragile.
- **Fix:** Fix at the source: remove/replace with non-seed demo values, or don't display real credentials from component source at all. Requires touching backend/prisma/seed.ts, not just the frontend.
- **Suggested command:** `/impeccable harden`

**[P1] Serif-Heads Rule, one of DESIGN.md's two named rules, violated everywhere.**
- **Why it matters:** No Head-scale label or `<th>` across any of the four screens carries `font-ledger`; they use Label-scale sans styling instead. The rule exists specifically so "the eye learns the register in one glance" — currently doesn't hold.
- **Fix:** Add `font-ledger` + correct Head sizing (0.72rem/0.14em) to every Head label and table header.
- **Suggested command:** `/impeccable typeset`

**[P1] DESIGN.md's own documented mobile behavior was never built.**
- **Why it matters:** The "2x2 balance block" and "stacked ledger slip" responsive patterns are explicitly specified in DESIGN.md's Layout section. Balance strips are static `flex divide-x` with zero breakpoints; tables just horizontal-scroll instead of restating as slips.
- **Fix:** Build the documented `md:hidden` stacked-slip component and 2x2 grid variant.
- **Suggested command:** `/impeccable adapt`

**[P2] EmployeeDashboard's bilingual fix didn't reach the Register itself.**
- **Why it matters:** "In Queue"/"Completed"/"No documents requested yet." stay hardcoded English regardless of the TH/EN toggle on the same screen.
- **Fix:** Move into the `t.TH`/`t.EN` dictionary.
- **Suggested command:** `/impeccable clarify`

**[P2, still deferred from prior round] Native `confirm()`/`alert()` still gate delete/reset/trigger-failure** — unchanged from last round, restating rather than re-flagging as new.

**[P3] Orphaned field:** AdminManagement's `formData.position` is read/written in state but has no corresponding input anywhere in the Add/Edit modal, only settable via CSV bulk upload.

## Persona Red Flags

**Jordan (first-timer):** Sees CertiPaws credentials directly under the CertiFlow wordmark at first touch, the exact P0 above from a fresh-eyes perspective.

**Sam (accessibility-dependent):** Icon-only Edit/Delete buttons still expose only `title=`, unchanged. Separately new: no button anywhere (Sign In, Add User, Trigger, tabs) got an explicit focus-visible treatment, only inputs did, so keyboard focus on every button relies on undocumented browser defaults, inconsistent with DESIGN.md's committed brass-bright ring.

**Alex (power user):** Monthly bulk-sync described in PRODUCT.md as the differentiator is still the least-served part of the UI: no bulk-trigger or search on the Requests register.

## Minor Observations

Three brand names now coexist (CertiFlow / CertiPaws / hireflow favicon). Dead `brand-red`/`brand-dark`/`brand-surface`/Prompt tokens sit unused alongside the new ones in index.html, a trap for the next editor. `daparture_date` typo persists (pre-existing, backend-coupled, not touched this round). No `scope="col"` or `<caption>`/`aria-label` on any of the three data tables.

## Questions to Consider

1. If the Serif-Heads Rule is missing everywhere, is this still "the Concierge Ledger," or a beige dashboard with brass buttons and serif page titles?
2. The dev-credential block survived two review passes with the wrong brand — does fixing the seed data actually belong on the frontend ticket, or is it silently blocked on a backend change nobody scheduled?
3. PRODUCT.md says bilingual applies "throughout, not just documents" — was Admin/RootLayout bilingual support ever actually in scope, or did it fall out by omission?
