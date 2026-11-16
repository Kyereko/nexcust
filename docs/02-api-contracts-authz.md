# 02 — API Contracts and Authorization Matrix

Base path `/api`. Interactive documentation: `/api/docs` (OpenAPI). Authentication: server-side session cookie. All list endpoints accept `q`, `status`, `page`, `pageSize` (max 100) and return `{ items, total, page, pageSize }`. Unknown parameters are rejected (400).

Status codes: `401` no session · `403` refused (always audited) · `404` not found · `400` validation · `429` rate limit.

## 1. Implemented (Days 1–3)

| Method & path | Permission | Jurisdiction applied | Audited |
|---|---|---|---|
| `POST /auth/login` | public (rate-limited) | — | success and failure |
| `POST /auth/logout` | session | — | yes |
| `GET /auth/me` | session | — | — |
| `GET /health` | public | — | — |
| `GET /persons?q=` | `person.read` | national, identity fields only | every search |
| `GET /reference` | session | caller's institution | — |
| `GET /police/dashboard` | `police.dashboard.read` | unit subtree | — |
| `GET /police/custody` | `police.custody.read` | unit subtree | — |
| `GET /police/custody/:id` | `police.custody.read` | subtree, re-checked on the record | view and refusal |
| `GET /police/cases` | `police.case.read` | unit subtree | — |
| `GET /police/personnel` | `police.personnel.read` | unit subtree | — |
| `GET /police/stations` | `police.facility.read` | unit subtree | — |
| `POST /persons` | `person.write` | national | creation; duplicate review enforced (409 `POSSIBLE_DUPLICATES` / `IDENTIFIER_EXISTS`) |
| `GET /police/persons/:id/record` | `police.case.read` | station records by subtree; convictions national | every view |
| `POST /police/arrests` | `police.custody.write` | station must be in subtree | yes |
| `POST /police/custody/:id/movements` | `police.custody.write` | subtree | yes |
| `POST /police/custody/:id/review` | `police.custody.close` | subtree; not the opening officer | yes |
| `POST /police/custody/:id/close` | `police.custody.close` | subtree; not the opening officer | yes |
| `POST /police/cases`, `PATCH /police/cases/:id`, `GET /police/cases/:id` | `police.case.write` / `.read` | subtree | yes |
| `GET /police/personnel/:id`, `GET /police/org-units`, `GET /police/postings` | `police.personnel.read` / `police.facility.read` | subtree | — |
| `POST /police/postings` | `police.personnel.write` | officer's unit in subtree | yes |
| `POST /police/postings/:id/approve` | `police.posting.approve` | releasing unit in subtree; not the initiator | yes |
| `POST /police/postings/:id/confirm` | `police.posting.approve` | receiving unit in subtree; not the initiator | yes |
| `POST /police/postings/:id/reject` | `police.posting.approve` | releasing or receiving unit | yes |
| `GET /prisons/dashboard` | `prisons.dashboard.read` | unit subtree | — |
| `GET /prisons/prisoners` | `prisons.prisoner.read` | unit subtree | — |
| `GET /prisons/prisoners/:episodeId` | `prisons.prisoner.read` | subtree, re-checked on the record | view and refusal |
| `GET /prisons/facilities` | `prisons.facility.read` | unit subtree | — |
| `GET /prisons/personnel` | `prisons.personnel.read` | unit subtree | — |
| `GET /persons/:id` | `person.read` | national, identity only | — |
| `GET /prisons/establishments` | `prisons.facility.read` | service-wide list (transfer targets) | — |
| `POST /prisons/admissions` | `prisons.prisoner.write` | establishment in subtree | yes; warrant type and reference recorded |
| `POST /prisons/prisoners/:episodeId/housing` | `prisons.prisoner.write` | subtree | yes |
| `GET /prisons/transfers` | `prisons.prisoner.read` | sending **or** receiving establishment in subtree | — |
| `POST /prisons/transfers` | `prisons.transfer.initiate` | prisoner held in subtree | yes |
| `POST /prisons/transfers/:id/approve` · `/reject` | `prisons.transfer.approve` | sending establishment; not the initiator | yes; approval dispatches (IN_TRANSIT) |
| `POST /prisons/transfers/:id/receive` | `prisons.prisoner.write` | receiving establishment | yes; prisoner moves registers |
| `GET /prisons/releases` | `prisons.prisoner.read` | subtree | — |
| `POST /prisons/releases` | `prisons.release.initiate` | subtree; legal authority mandatory | yes |
| `POST /prisons/releases/:id/approve` · `/reject` | `prisons.release.approve` | subtree; not the initiator | yes; approval completes release and closes custody |
| `GET /prisons/rehabilitation`, `POST /prisons/rehabilitation/enrollments` | `prisons.rehab.read` / `.write` | subtree; programme at the prisoner's establishment | yes |
| `GET /prisons/personnel/:id`, `/prisons/org-units`, `/prisons/postings` and `POST /prisons/postings…` | as the police equivalents | as police | yes |
| `GET /admin/users` | `platform.users.manage` | platform | — |
| `GET /audit/events` | `audit.read` | all (auditor, platform) or own institution | — |

## 2. Contracted for Day 4 (not yet implemented)

Every state-changing endpoint writes an audit event. "Maker–checker" means the approver must be a different user from the initiator.

| Day | Method & path | Permission | Notes |
|---|---|---|---|
| 4 | `POST /applicant/background-checks`, `GET …/mine` | `applicant.bgcheck.submit` | Own records only |
| 4 | `GET /police/background-checks`, `POST …/:id/advance` | `police.bgcheck.read` / `.review` | Stage transitions with findings |
| 4 | `POST /police/background-checks/:id/decision` | `police.bgcheck.approve` | Human decision; issues sample certificate |
| 4 | `GET /verify/:code` | public (rate-limited) | Returns validity only, no personal record |
| 4 | `POST /exchange/requests` | `exchange.request` | Purpose + legal basis; minimal disclosure; logged |

Open contract question: no demo role currently holds `police.bgcheck.approve`. Recommended: a separate approving officer role, so the reviewer cannot approve their own review.

## 3. Roles

| Role | Institution | Scope | Normally assigned at | Workspace |
|---|---|---|---|---|
| Platform Administrator | — | PLATFORM | — | admin |
| Police National Administrator | POLICE | ORG_UNIT | National HQ | police |
| Police Regional Commander | POLICE | ORG_UNIT | Regional command | police |
| Police Station Commander | POLICE | ORG_UNIT | Station / establishment | police |
| Police Records Officer | POLICE | ORG_UNIT | Station / establishment | police |
| Police HR Officer | POLICE | ORG_UNIT | National HQ | police |
| Background Check Officer | POLICE | ORG_UNIT | National HQ | police |
| Prisons National Administrator | PRISONS | ORG_UNIT | National HQ | prisons |
| Prison Superintendent | PRISONS | ORG_UNIT | Station / establishment | prisons |
| Prison Records Officer | PRISONS | ORG_UNIT | Station / establishment | prisons |
| Prison HR Officer | PRISONS | ORG_UNIT | National HQ | prisons |
| Auditor | — | PLATFORM | — | audit |
| Public Applicant | — | SELF | — | applicant |

`ORG_UNIT` roles act only inside the organizational unit they are assigned to and everything beneath it.

## 4. Authorization matrix (generated from `packages/contracts`)

| Permission | PLATFORM ADMIN | POLICE NATIONAL ADMIN | POLICE REGIONAL COMMANDER | POLICE STATION COMMANDER | POLICE RECORDS OFFICER | POLICE HR OFFICER | BACKGROUND CHECK OFFICER | PRISONS NATIONAL ADMIN | PRISON SUPERINTENDENT | PRISON RECORDS OFFICER | PRISON HR OFFICER | AUDITOR | PUBLIC APPLICANT |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `platform.users.manage` | ● |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.config.manage` | ● |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.read` | ● | ● |  |  |  |  |  | ● |  |  |  | ● |  |
| `person.read` |  | ● | ● | ● | ● |  | ● | ● | ● | ● |  |  |  |
| `person.write` |  |  |  |  | ● |  |  |  |  | ● |  |  |  |
| `person.identity.amend` |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `exchange.request` |  | ● |  |  |  |  |  | ● |  |  |  |  |  |
| `police.dashboard.read` |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  |
| `police.custody.read` |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  |
| `police.custody.write` |  |  |  |  | ● |  |  |  |  |  |  |  |  |
| `police.custody.close` |  | ● | ● | ● |  |  |  |  |  |  |  |  |  |
| `police.case.read` |  | ● | ● | ● | ● |  | ● |  |  |  |  |  |  |
| `police.case.write` |  |  |  |  | ● |  |  |  |  |  |  |  |  |
| `police.personnel.read` |  | ● | ● | ● |  | ● |  |  |  |  |  |  |  |
| `police.personnel.write` |  |  |  |  |  | ● |  |  |  |  |  |  |  |
| `police.posting.approve` |  | ● | ● | ● |  |  |  |  |  |  |  |  |  |
| `police.facility.read` |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  |
| `police.bgcheck.read` |  | ● |  |  |  |  | ● |  |  |  |  |  |  |
| `police.bgcheck.review` |  |  |  |  |  |  | ● |  |  |  |  |  |  |
| `police.bgcheck.approve` |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `prisons.dashboard.read` |  |  |  |  |  |  |  | ● | ● | ● | ● |  |  |
| `prisons.prisoner.read` |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |
| `prisons.prisoner.write` |  |  |  |  |  |  |  |  |  | ● |  |  |  |
| `prisons.transfer.initiate` |  |  |  |  |  |  |  |  |  | ● |  |  |  |
| `prisons.transfer.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |
| `prisons.release.initiate` |  |  |  |  |  |  |  |  |  | ● |  |  |  |
| `prisons.release.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |
| `prisons.personnel.read` |  |  |  |  |  |  |  | ● | ● |  | ● |  |  |
| `prisons.personnel.write` |  |  |  |  |  |  |  |  |  |  | ● |  |  |
| `prisons.posting.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |
| `prisons.facility.read` |  |  |  |  |  |  |  | ● | ● | ● | ● |  |  |
| `prisons.rehab.read` |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |
| `prisons.rehab.write` |  |  |  |  |  |  |  |  |  | ● |  |  |  |
| `applicant.bgcheck.submit` |  |  |  |  |  |  |  |  |  |  |  |  | ● |

## 5. Rules every workstream must follow

1. Every route declares `@RequirePermission(...)` or `@Public()`. Undeclared routes need a session; there is no anonymous default.
2. Every query on jurisdictional data applies `req.scope` (`unitWhere`), and single-record reads call `inScope` and audit a refusal.
3. Police code never queries prison tables and the reverse. Cross-institution needs go through `/exchange`.
4. No endpoint decides guilt, detention, sentence length or release. Endpoints record a named human's decision.
5. Changes to `packages/contracts` or `schema.prisma` go through the Chief Architect workstream.
