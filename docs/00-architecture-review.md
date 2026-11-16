# 00 — Architecture Review and Reconciliation

**Project:** JusticeOne Ghana (Fourth IT) · **Status:** Day 1 foundation delivered · **Environment:** DEMONSTRATION, synthetic data only.
This prototype is not an official system of the Ghana Police Service or the Ghana Prisons Service.

Purpose: record where this implementation follows the ChatGPT specification, where it deliberately deviates, and what must be reconciled before further workstreams start. **The code in `packages/contracts` and `packages/database/prisma/schema.prisma` is the authoritative contract.**

## 1. Verdict

The proposed architecture is sound for a five-day prototype: modular monolith, PostgreSQL + Prisma, NestJS API, Next.js web, RBAC + jurisdiction attributes, shared person index. Adopted as specified, with the changes below.

## 2. Decisions that differ from the original specification

| # | Original | Implemented | Why |
|---|---|---|---|
| D1 | Jurisdiction by `region` / `facility` columns | **Organizational-unit tree** (`organizational_units.path`); a role assignment is bound to one unit and covers its subtree | Police command is HQ → Regional Command → Division → District → Station, and the 25 police regional commands are not the 16 administrative regions. One mechanism covers every tier and survives boundary changes. `regions` is retained as geography only. |
| D2 | Personnel table with rank | **Rank, appointment and posting are three tables with three histories** (`ranks`, `appointments`, `*_rank_history`, `*_command_assignments`, `*_postings`) | Mandatory research requirement. A DCOP may hold a regional command; the rank says nothing about the office. |
| D3 | Hard-coded lists | **Reference tables with `verificationStatus` + `sourceRef`** (ranks, appointments, unit types, facility types, units) | Unverified institutional facts must not live in application logic. The UI shows the evidence status. |
| D4 | "Two institution-specific applications" | **One web app with two workspaces, one API with two isolated modules** | The spec also says "modular monolith"; two deployables would double the work. Police and Prisons modules never import each other. |
| D5 | Tables listed in spec | Added `sessions`, `role_permissions`, `org_unit_types`, `facility_types`, `housing_units`, `police_case_persons`, `charges`, `conviction_records`, `approval_requests`, `data_exchange_requests`, `rehabilitation_programmes` | Needed for server-side sessions, permission mapping, maker–checker, and to keep arrest ≠ charge ≠ conviction. |
| D6 | Platform Administrator "system monitoring" | Platform Administrator has **no access to operational records** | Separation of duties: the person who provisions accounts must not read custody or criminal records. |
| D7 | Public clearance portal built from scratch | **Internal case processing + certificate verification demo**, positioned to complement the existing GPS e-service | Research: the Police already run an online clearance service (application, payment, fingerprint appointment). Replacing it is neither necessary nor credible. |
| D8 | Search index, document store | PostgreSQL `pg_trgm` for name search; document metadata table only | No extra infrastructure in a five-day sprint. |
| D9 | Vitest/Jest | Jest (API) + Playwright (browser) | One runner per layer. |
| D10 | shadcn/ui | Tailwind with a small in-repo component set in the shadcn style | Avoided a generator dependency on Day 1; components can be swapped for shadcn primitives without changing pages. |

## 3. Gaps and contradictions found in the specification

1. **Conviction data has no owner.** The spec wants "criminal records" but lists no conviction table. Added `conviction_records`, sourced from a court document and entered by a human. Background checks must read convictions, never arrests.
2. **Sentence calculation.** Remission rules (NRCD 46 / Prisons Regulations) are unverified. The system stores release dates **as entered from the warrant** and computes nothing. This also satisfies "no automated legal determinations".
3. **48-hour rule.** Article 14(3) of the 1992 Constitution is implemented as a stored `courtDeadlineAt` and a dashboard indicator, not as an automatic action. How the period is counted in practice is an open stakeholder question.
4. **Identity matching.** Index search is exact-identifier or name-contains, results are identity only, every search is audited, and no merge function exists. A reviewed-link workflow is on the backlog.
5. **Cross-institution exchange** was undefined. Contract: a request carries a purpose and legal basis, returns a minimal disclosed summary, and is logged in `data_exchange_requests`. No direct table access across modules.
6. **Day 4 was overloaded** (background checks + integration + dashboards). Dashboards and the person index moved to Day 1; see the execution plan.
7. **Station commander scope vs shared persons.** Identity is national; operational records are jurisdictional. Enforced separately.
8. **Real facility names.** Regional command names are real and evidence-tagged; every station and prison in the demo is fictional and labelled `DEMO`. The official register of 46 establishments is not yet loaded because the published lists disagree (45 named, differing groupings).

## 4. Security architecture as built

- **Sessions:** opaque 256-bit token in an httpOnly, SameSite=Lax cookie; only its SHA-256 is stored; 8-hour expiry; revocation on logout. Passwords: scrypt. Lockout after 5 failures; sign-in rate-limited.
- **Authorization:** one global guard, deny by default. Route declares a permission → guard resolves the caller's unit subtrees → handlers filter every query by them and re-check on single-record reads. Institution-namespaced permissions only count when granted through a role of that institution.
- **Audit:** append-only table enforced by a database trigger. Sign-ins, record views, person searches and **every refusal** are recorded.
- **Web tier:** same-origin proxy to the API (no CORS surface), Origin check on state-changing requests, security headers, `noindex`.
- **Database:** `onDelete: Restrict` on all justice records; partial unique indexes guarantee one open custody episode per person and one current posting per officer.

## 5. Items for reconciliation with the ChatGPT specification

1. Accept D1–D3 as binding for every workstream (they change table and column names).
2. Confirm the clearance scope in D7.
3. Confirm separate personnel tables per institution (kept as specified) rather than one shared table.
4. Column naming is Prisma camelCase with snake_case table names; change now or never.
5. Roles are scoped by org unit: "Regional Commander" is a role assigned at a Regional Command unit, not a hard-coded level.
