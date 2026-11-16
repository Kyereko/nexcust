# 03 — Agent Execution Plan, Backlog and Progress Report

## 1. Workstreams

| # | Workstream | Owns | May not change without the Architect |
|---|---|---|---|
| 1 | Chief Architect | `packages/contracts`, `docs/00–03`, review of every schema or contract change | — |
| 2 | Database | `packages/database` | Table or column names used by others |
| 3 | Police | `apps/api/src/police`, `apps/web/app/(workspace)/police` | Auth, audit, shared |
| 4 | Prisons | `apps/api/src/prisons`, `apps/web/app/(workspace)/prisons` | Auth, audit, shared |
| 5 | Frontend | `apps/web/components`, layout, navigation | API contracts |
| 6 | Integration | `apps/api/src/shared` (person index, exchange, background checks) | Institution modules |
| 7 | Security & QA | `apps/api/test`, `apps/web/e2e`; reviews every merge | — |
| 8 | DevOps | Docker, CI, deployment | Application code |
| 9 | Ghana Institutional Research & Compliance | `docs/research`, `packages/database/reference` | Statuses are changed only with a cited source |

Branching: one branch per workstream off the integration branch; merge only with API tests and browser tests green. Workstreams 3 and 4 touch disjoint directories and can run fully in parallel. Workstream 6 starts after 3 and 4 expose their read services.

## 2. Schedule and backlog

Legend: ✅ done and tested · ◻ open.

### Day 1 — Foundation and research (complete)
- ✅ Monorepo (pnpm + Turborepo), contracts package, 50-table schema, two migrations, deterministic seed
- ✅ Session authentication, lockout, rate limiting, CSRF origin check
- ✅ Permission + org-unit jurisdiction guard; refusals audited; append-only audit table
- ✅ Application shell with five workspaces, live dashboards, custody register and detail, case register, prisoner registry and detail, personnel, stations, facilities, users, audit trail, reference-data view
- ✅ Research pack: nine documents, evidence register, 46 stakeholder questions
- ✅ 24 API security tests, 6 browser tests (63 and 12 after Day 4)

### Day 2 — Police workflows (complete)
All six items delivered with API and browser tests. Not built: a station-to-station custody transfer screen (the API supports it) and linking additional persons or charges to a case from the UI.

| ID | Task | Depends on | Acceptance test |
|---|---|---|---|
| ✅ P-01 | Person search + create with duplicate review | — | Search existing person; create only after confirmation |
| ✅ P-02 | Register arrest → open custody episode | ✅ P-01 | Register detainee: saved, searchable, visible only in jurisdiction |
| ✅ P-03 | Movements, bail, court transfer, close with authorized disposition | ✅ P-02 | Status transitions; maker–checker enforced |
| ✅ P-04 | Person police record (arrests / charges / convictions separated) | ✅ P-01 | Conviction shown only from `conviction_records` |
| ✅ P-05 | Posting: propose → approve → confirm | — | Current posting updates; history remains |
| ✅ P-06 | Case create / update | — | Record creation and retrieval |

### Day 3 — Prisons workflows (complete)
All five items delivered with API and browser tests. Release dates and remission are never computed; the officer enters them from the warrant.

| ID | Task | Depends on | Acceptance test |
|---|---|---|---|
| ✅ R-01 | Court order entry + admission | ✅ P-01 | Register prisoner: admission saved, registry updated |
| ✅ R-02 | Transfer: initiate → approve → receive | ✅ R-01 | Both establishments reflect the transfer |
| ✅ R-03 | Release: initiate → approve → complete | ✅ R-01 | Custody status updates with authorization history |
| ✅ R-04 | Prison postings | P-05 pattern | As P-05 |
| ✅ R-05 | Rehabilitation enrollments, housing assignment | ✅ R-01 | Enrollment recorded |

### Day 4 — Integration (complete)
Delivered with API and browser tests, plus the NEXCUST rename and brand identity (`docs/05-brand-identity.md`).

| ID | Task | Depends on | Acceptance test |
|---|---|---|---|
| ✅ I-01 | Background-check case processing + decision + sample certificate | ✅ P-04 | Application progresses through review |
| ✅ I-02 | Certificate verification endpoint and page | ✅ I-01 | Verifiable demonstration certificate |
| ✅ I-03 | Authorized exchange (police remand ↔ prison admission) | P-03, R-01 | Logged, purpose-bound disclosure |
| ✅ I-04 | Reports and national roll-ups | Days 2–3 | Dashboard reflects saved records |

### Day 5 — Hardening and demonstration
- ◻ Full browser run of all twelve acceptance scenarios
- ◻ Container build verified, demonstration environment deployed over HTTPS
- ◻ Ghana-context walkthrough against the open-questions list
- ◻ Known-limitations and handover pack

Rule: no new features after Day 3 unless required to finish a core scenario.

## 3. Acceptance criteria status

| Scenario | Status |
|---|---|
| Police login opens police workspace | ✅ automated |
| Prison login opens prisons workspace | ✅ automated |
| Search existing person (authorized, identity only) | ✅ automated (API and browser) |
| National dashboard reflects saved records | ✅ automated |
| Unauthorized access denied and logged | ✅ automated (API and browser) |
| Register detainee: saved and searchable | ✅ automated (API and browser) |
| Police officer transfer: current posting updates, history remains | ✅ automated (API and browser) |
| Register prisoner: admission saved | ✅ automated (API and browser) |
| Transfer prisoner: both establishments reflect it | ✅ automated (API and browser) |
| Release prisoner: status updates with authorization history | ✅ automated (API and browser) |
| Background-check application progresses through review | ✅ automated (API and browser) |
| Generate sample certificate, verifiable | ✅ automated (API and browser) |

## 4. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Institutional facts wrong or outdated | Loss of credibility in front of officers | Evidence statuses shown in the product; stakeholder questions prepared; nothing unverified in logic |
| Rank lists read only as excerpts | Minor naming errors | Check against a gazette copy of C.I. 76 and C.I. 92 before the demonstration |
| Prototype mistaken for an official system | Reputational and legal | Permanent banner, `DEMO` prefixes, synthetic flags, `noindex` |
| Scope growth | Missed deadline | Feature freeze after Day 3 |
| Path from prototype to production underestimated | Commercial | Separate programme: data protection (Act 843) registration and impact assessment, security accreditation, MFA, hosting in an approved environment, formal MoUs for any integration with CDSB / e-services |
