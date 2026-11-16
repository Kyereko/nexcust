# 02 — API Contracts and Authorization Matrix

Base path `/api`. Interactive documentation: `/api/docs` (OpenAPI). Authentication: server-side session cookie. All list endpoints accept `q`, `status`, `page`, `pageSize` (max 100) and return `{ items, total, page, pageSize }`. Unknown parameters are rejected (400).

Status codes: `401` no session · `403` refused (always audited) · `404` not found · `400` validation · `429` rate limit.

## 1. Implemented (Days 1–4)

| Method & path | Permission | Jurisdiction applied | Audited |
|---|---|---|---|
| `POST /auth/login` | public (rate-limited) | — | success and failure |
| `POST /auth/logout` | session | — | yes |
| `GET /auth/me` | session | — | — |
| `POST /auth/invitation` | public (rate-limited); token in body | — | — |
| `POST /auth/invitation/accept` | public (rate-limited); token in body | creates the account with its access profile | success and refusal |
| `GET /admin/invitations`, `GET /admin/invitations/meta` | `platform.users.manage` | platform | — |
| `POST /admin/invitations` | `platform.users.manage` | platform | yes (with email outcome) |
| `POST /admin/invitations/:id/resend`, `/revoke` | `platform.users.manage` | platform | yes |
| `POST /admin/users/:id/status` | `platform.users.manage` (not on own account; one active administrator always remains) | platform | yes |
| `GET /health` | public | — | — |
| `GET /persons?q=` | `person.read` | national, identity fields only | every search |
| `GET /reference` | session | caller's institution | — |
| `GET /police/dashboard` | `police.dashboard.read` | unit subtree | — |
| `GET /police/custody` | `police.custody.read` | unit subtree | — |
| `GET /police/custody/:id` | `police.custody.read` | subtree, re-checked on the record | view and refusal |
| `GET /police/cases` | `police.case.read` | unit subtree | — |
| `GET /police/personnel` | `police.personnel.read` | unit subtree | — |
| `GET /police/stations` | `police.facility.read` | unit subtree | — |
| `GET /police/stations/directory?q=&command=` | `police.facility.read` | unit subtree; a command filter narrows, never widens | — |
| `GET /police/map` | `police.dashboard.read` | unit subtree; totals by administrative region plus each mapped station's figures (no person) | — |
| `GET /prisons/map` | `prisons.dashboard.read` | unit subtree; population, remand and occupancy by region and establishment (occupancy only where capacity is published) | — |
| `POST /persons` | `person.write` | national | creation; duplicate review enforced (409 `POSSIBLE_DUPLICATES` / `IDENTIFIER_EXISTS`) |
| `GET /police/persons/:id/record` | `police.case.read` | station records by subtree; convictions national | every view |
| `POST /police/arrests` | `police.custody.write` | station must be in subtree; arrest basis and rights information (art. 14(2)) required | yes |
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
| `GET /police/reports` · `GET /prisons/reports` | `police.dashboard.read` · `prisons.dashboard.read` | roll-up by regional command in subtree (own unit below regional level) | — |
| `GET /police/background-checks`, `GET /police/background-checks/:id` | `police.bgcheck.read` | national | detail views |
| `GET /police/background-checks/reference` | `police.bgcheck.read` | service catalogue, signatory register, parameters | — |
| `POST /police/background-checks/:id/advance` | `police.bgcheck.review` | portal order enforced: payment → appointment → attendance → criminal ident → (investigation) → ready for signature | yes |
| `POST /police/background-checks/:id/request-info` | `police.bgcheck.review` | any processing stage; resumes where it stopped | yes |
| `POST /police/background-checks/:id/dispatch` | `police.bgcheck.review` | issued certificates; Ghana Post | yes |
| `POST /police/background-checks/:id/decision` | `police.bgcheck.approve` + authorised signatory register | not any officer who processed the application; investigated records need written wording | yes; approval signs and issues the certificate |
| `GET /applicant/background-checks/service-types` | `applicant.bgcheck.submit` | published services and fees | — |
| `GET/POST /applicant/background-checks`, `GET /applicant/background-checks/:id` | `applicant.bgcheck.submit` | own applications only; coarse status, no internal findings | submission |
| `GET /verify/:code` | public, 30/min per IP | returns authenticity, status and what is printed on the certificate | every check |
| `POST /exchange/requests` | `exchange.request` | other institution only; purpose and legal basis mandatory; fixed minimal summary | yes |
| `GET /exchange/requests/:id` | `exchange.request` | requester only | — |
| `POST /police/custody/:id/search` | `police.custody.write` | subtree; female detainee needs a female officer or a recorded reason | yes |
| `POST /police/custody/:id/property`, `POST /police/custody/property/:itemId/outcome` | `police.custody.write` | subtree; release blocked while items are unaccounted for | yes |
| `GET /police/reports/s16?month=YYYY-MM` | `police.dashboard.read` | subtree; juvenile identities protected | yes |
| `POST /police/custody/:id/juvenile-notice` | `police.custody.write` | subtree; juvenile episodes only | yes |
| `POST /prisons/prisoners/:episodeId/remand-renewals` | `prisons.prisoner.write` | subtree; remand prisoner held | yes |
| `GET /prisons/remand-warrants/attention` | `prisons.prisoner.read` | subtree | — |
| `POST /prisons/sentences/:id/remission` | `prisons.prisoner.write` | prisoner held in subtree | yes |
| `POST /prisons/sentences/:id/forfeitures` | `prisons.release.approve` | prisoner held in subtree | yes |
| `POST /prisons/releases/:id/warrant-returned` | `prisons.prisoner.write` | subtree; completed releases | yes |
| `GET /admin/users` | `platform.users.manage` | platform | — |
| `GET /audit/events` | `audit.read` | all (auditor, platform) or own institution | — |

## 2. Disclosure rules (demonstration assumptions, to be confirmed)

| Channel | Discloses | Never discloses |
|---|---|---|
| Clearance records search | Court-recorded convictions | Arrests, charges, custody, case narrative |
| Police → prisons exchange | Police custody episodes: reference, station, status, dates | Suspected offence, legal-authority text, cell, disposition note |
| Prisons → police exchange | Whether and where held: establishment, status, classification, dates | Sentence, offence |
| Certificate verification | Certificate number, status, holder, date of birth, purpose, printed result, dates | Anything not printed on the certificate |

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
| Tester · Police | POLICE | ORG_UNIT | National HQ | police |
| Tester · Prisons | PRISONS | ORG_UNIT | National HQ | prisons |

`ORG_UNIT` roles act only inside the organizational unit they are assigned to and everything beneath it.

**Access profiles and invitations.** People are invited, never given a password. `ACCESS_PROFILES` in `packages/contracts` names the roles an invitation grants; the only profile today is **Tester**: `TESTER_POLICE` and `TESTER_PRISONS` (every operational permission of the institution at its national headquarters, plus `audit.read`) and `PUBLIC_APPLICANT`. Testers hold no `platform.*` permission and no `police.juvenile.read` (Act 653 s.3 keeps identities at the handling station). Maker–checker still applies, so a full approval cycle needs two testers. The invitation link carries a 32-byte token in the URL fragment (never sent to a server or written to request logs); only its SHA-256 is stored; it works once and expires after 72 hours; resending replaces it. Email goes through Resend when `RESEND_API_KEY` and `MAIL_FROM` are set; otherwise the administrator copies the link.

## 4. Authorization matrix (generated from `packages/contracts`)

| Permission | PLATFORM ADMIN | POLICE NATIONAL ADMIN | POLICE REGIONAL COMMANDER | POLICE STATION COMMANDER | POLICE RECORDS OFFICER | POLICE HR OFFICER | BACKGROUND CHECK OFFICER | PRISONS NATIONAL ADMIN | PRISON SUPERINTENDENT | PRISON RECORDS OFFICER | PRISON HR OFFICER | AUDITOR | PUBLIC APPLICANT | TESTER POLICE | TESTER PRISONS |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `platform.users.manage` | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `platform.config.manage` | ● |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.read` | ● | ● |  |  |  |  |  | ● |  |  |  | ● |  | ● | ● |
| `person.read` |  | ● | ● | ● | ● |  | ● | ● | ● | ● |  |  |  | ● | ● |
| `person.write` |  |  |  |  | ● |  |  |  |  | ● |  |  |  | ● | ● |
| `person.identity.amend` |  |  |  |  |  |  |  |  |  |  |  |  |  | ● | ● |
| `exchange.request` |  | ● |  |  | ● |  |  | ● |  | ● |  |  |  | ● | ● |
| `police.dashboard.read` |  | ● | ● | ● | ● | ● | ● |  |  |  |  |  |  | ● |  |
| `police.custody.read` |  | ● | ● | ● | ● |  |  |  |  |  |  |  |  | ● |  |
| `police.custody.write` |  |  |  |  | ● |  |  |  |  |  |  |  |  | ● |  |
| `police.custody.close` |  | ● | ● | ● |  |  |  |  |  |  |  |  |  | ● |  |
| `police.juvenile.read` |  |  |  | ● | ● |  |  |  |  |  |  |  |  |  |  |
| `police.case.read` |  | ● | ● | ● | ● |  | ● |  |  |  |  |  |  | ● |  |
| `police.case.write` |  |  |  |  | ● |  |  |  |  |  |  |  |  | ● |  |
| `police.personnel.read` |  | ● | ● | ● |  | ● |  |  |  |  |  |  |  | ● |  |
| `police.personnel.write` |  |  |  |  |  | ● |  |  |  |  |  |  |  | ● |  |
| `police.posting.approve` |  | ● | ● | ● |  |  |  |  |  |  |  |  |  | ● |  |
| `police.facility.read` |  | ● | ● | ● | ● | ● |  |  |  |  |  |  |  | ● |  |
| `police.bgcheck.read` |  | ● |  |  |  |  | ● |  |  |  |  |  |  | ● |  |
| `police.bgcheck.review` |  |  |  |  |  |  | ● |  |  |  |  |  |  | ● |  |
| `police.bgcheck.approve` |  | ● |  |  |  |  |  |  |  |  |  |  |  | ● |  |
| `prisons.dashboard.read` |  |  |  |  |  |  |  | ● | ● | ● | ● |  |  |  | ● |
| `prisons.prisoner.read` |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |  | ● |
| `prisons.prisoner.write` |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● |
| `prisons.transfer.initiate` |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● |
| `prisons.transfer.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  | ● |
| `prisons.release.initiate` |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● |
| `prisons.release.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  | ● |
| `prisons.personnel.read` |  |  |  |  |  |  |  | ● | ● |  | ● |  |  |  | ● |
| `prisons.personnel.write` |  |  |  |  |  |  |  |  |  |  | ● |  |  |  | ● |
| `prisons.posting.approve` |  |  |  |  |  |  |  | ● | ● |  |  |  |  |  | ● |
| `prisons.facility.read` |  |  |  |  |  |  |  | ● | ● | ● | ● |  |  |  | ● |
| `prisons.rehab.read` |  |  |  |  |  |  |  | ● | ● | ● |  |  |  |  | ● |
| `prisons.rehab.write` |  |  |  |  |  |  |  |  |  | ● |  |  |  |  | ● |
| `applicant.bgcheck.submit` |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |

## 5. Rules every workstream must follow

1. Every route declares `@RequirePermission(...)` or `@Public()`. Undeclared routes need a session; there is no anonymous default.
2. Every query on jurisdictional data applies `req.scope` (`unitWhere`), and single-record reads call `inScope` and audit a refusal.
3. Police code never queries prison tables and the reverse. Cross-institution needs go through `/exchange`.
4. No endpoint decides guilt, detention, sentence length or release. Endpoints record a named human's decision.
5. Changes to `packages/contracts` or `schema.prisma` go through the Chief Architect workstream.
