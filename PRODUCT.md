# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Employee** — hotel staff who need routine HR documents (salary certificate, employment certificate, visa application letter; payslip reprint and withholding tax certificate are planned) for personal use — bank loans, visa applications, education, etc. They log in themselves and submit a self-service request.
- **General Admin** — HR staff who review and trigger/reprint employee document requests, manage Employee accounts (CRUD), bulk-upsert employee records (e.g. monthly staff sync), and reset Employee passwords only.
- **Super Admin** — full administrative authority: everything General Admin can do, plus managing General Admin accounts and resetting any user's password. Super Admin accounts are provisioned only via direct database access, never through the app's own user-creation endpoint.

## Product Purpose

CertiFlow automates the HR document-request workflow for a single hotel property: an employee requests a certificate through a bilingual (Thai/English) self-service portal, and the system generates a filled `.docx` from a fixed template using the employee's profile data plus any request-specific fields (dates, salary figures, travel details, etc.). It replaces a manual, paper-driven certificate request process with a tracked, role-gated digital one, backed by an audit log of every administrative action (password resets, user changes, bulk syncs).

## Positioning

The differentiator is the hierarchical RBAC + audit-logged administrative layer built specifically around hotel HR operations (Marriott-style monthly staff bulk-sync via CSV upsert keyed on employee ID, Thai national ID / passport-based default password issuance, strict Super Admin > General Admin > Employee hierarchy enforced server-side) combined with templated bilingual document generation — not a generic forms/e-signature product.

## Operating Context

- Single hotel property's HR department (Marriott-branded document templates and terminology are fixed to this property, not white-labeled).
- Thai national ID (`thai_id`) or passport number is the source for auto-generated default passwords (last 6 digits), used at account creation and password reset.
- Monthly bulk employee data sync from property HR records via CSV upsert (`ON CONFLICT` on employee ID), per the Admin CRUD & RBAC Strategy document.
- Backend runs on Cloudflare Workers (Hono), Postgres via Supabase, Prisma ORM; SHA-256 password hashing was adopted specifically because bcrypt was too slow for Worker CPU limits (mid-migration from a prior bcrypt-hashed dataset).
- Frontend is a React SPA (bilingual TH/EN UI throughout, not just documents).

## Capabilities and Constraints

- Supported document types today: `salary_cert`, `emp_cert`, `visa_letter` (each has a real `.docx` template and field mapping).
- **Known open gap:** `payslip_copy` and `tax_50` are exposed as request options in the UI and accepted by the API, but have no `.docx` template or generation logic yet — requests for these types cannot currently produce a real document.
- **Known open gap:** the employee download route (`GET /downloads/:filename`) is a stub returning 404 — file storage (R2 or Supabase Storage) is not yet wired up, so generated documents cannot currently be downloaded through that endpoint.
- Roles: `EMPLOYEE`, `GENERAL_ADMIN`, `SUPER_ADMIN` — hierarchy strictly enforced server-side (General Admin cannot touch Super Admin or other General Admin accounts; only Super Admin can create/reset General Admins, and Super Admin accounts themselves are DB-provisioned only).
- Every password reset, user creation/deletion, and bulk change is recorded in `SystemAuditLog` (actor, role, action, target, details, timestamp).
- Account lockout / rate limiting exists on login (failed-attempt counter, lockout window).

## Brand Commitments

- Product name: **CertiFlow**.
- Existing document templates and UI copy carry Marriott branding (property-specific certificates/visa letters); this is a binding constraint, not a placeholder to design around.

## Evidence on Hand

- `CertiFlow Administrative Strategy.pdf` — the RBAC/CRUD/bulk-sync spec this backend implements (role matrix, hierarchical password-reset logic, bulk upsert SQL pattern, audit logging requirement).
- Real `.docx` templates in `frontend/document_template/` and `backend/src/templates/` for salary certificate, employment letter, and visa letter (Marriott-branded).
- No real user counts, testimonials, or usage metrics on hand — do not fabricate scale claims.

## Product Principles

1. Server-side role hierarchy is the source of truth — never trust client-side role gating alone.
2. Every administrative mutation (password reset, user CRUD, bulk sync) must be audit-logged.
3. Bilingual parity (Thai/English) is a first-class requirement, not an afterthought — applies to UI copy and generated documents alike.
4. Document generation is template-driven and property-specific; don't generalize it into a multi-tenant/configurable system without an explicit decision to do so.
5. Don't assume `payslip_copy`, `tax_50` generation, or file download work end-to-end — verify before building on top of them.

## Accessibility & Inclusion

No product-specific accessibility standard has been established; bilingual Thai/English support is a confirmed requirement (see Product Principles).
