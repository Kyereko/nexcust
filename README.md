# JusticeOne Ghana — Demonstration Prototype

**Fourth IT** · Integrated police and prisons records management.

> **DEMONSTRATION ONLY.** Synthetic data. This is not an official system of the Ghana Police Service or the Ghana Prisons Service, holds no real records, and is not connected to any government system.

## What works today (Day 3 of 5)

- Sign-in with server-side sessions; 15 demonstration accounts across 13 roles
- Police and Prisons workspaces with live dashboards from the database
- Custody register, case register, prisoner registry, personnel (rank / appointment / posting shown separately), stations, prison facilities and occupancy
- Access control by role **and** command-tree jurisdiction, enforced in the API
- Append-only audit trail including every refused request
- Ghana institutional reference data (ranks, appointments, unit types) with evidence status
- Police workflows: person search and registration with duplicate review, arrest and custody through to authorized closure, case management, officer posting (propose → approve → confirm)
- Prisons workflows: admission against a verified warrant, transfer (initiate → approve and dispatch → receiving establishment confirms), release (initiate → second officer authorizes), housing, rehabilitation enrollment, officer postings
- 52 API tests and 9 browser tests

Background checks, certificate verification, cross-institution exchange and reports are scheduled for Day 4: see `docs/03-agent-execution-plan.md`.

## Structure

```
justiceone/
├── apps/
│   ├── api/            NestJS API (auth, audit, shared, police, prisons)
│   └── web/            Next.js web app (workspaces, e2e tests)
├── packages/
│   ├── contracts/      Roles, permissions, authorization matrix, shared types
│   └── database/       Prisma schema, migrations, seed, Ghana reference data
├── docs/
│   ├── 00-architecture-review.md
│   ├── 01-database-schema.md
│   ├── 02-api-contracts-authz.md
│   ├── 03-agent-execution-plan.md
│   └── research/       Institutional research pack and evidence register
├── docker-compose.yml
└── .env.example
```

## Setup (local)

Requires Node 20+, pnpm 10, PostgreSQL 16.

```bash
cp .env.example .env
```

```bash
pnpm install
```

```bash
pnpm build
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

```bash
pnpm dev
```

Web: http://localhost:3000 · API documentation: http://localhost:4000/api/docs

The database needs the `pg_trgm` extension; the migration creates it, which requires a role allowed to create trusted extensions.

## Demonstration accounts

Password for all accounts: the value of `DEMO_PASSWORD` in `.env` (default `Demo!Pass2026`).

| Email | Role | Jurisdiction |
|---|---|---|
| admin@justiceone.demo | Platform Administrator | Platform (no operational records) |
| police.national@justiceone.demo | Police National Administrator | National Police Headquarters |
| police.regional@justiceone.demo | Police Regional Commander | Accra Regional Police Command |
| police.station@justiceone.demo | Police Station Commander | DEMO Accra Station 1 |
| police.records@justiceone.demo | Police Records Officer | DEMO Accra Station 1 |
| police.records.kumasi@justiceone.demo | Police Records Officer | DEMO Ashanti Station 1 |
| police.hr@justiceone.demo | Police HR Officer | National Police Headquarters |
| police.bgcheck@justiceone.demo | Background Check Officer | National Police Headquarters |
| prisons.national@justiceone.demo | Prisons National Administrator | Prisons Service Headquarters |
| prisons.superintendent@justiceone.demo | Prison Superintendent (Officer-in-Charge) | DEMO Ashanti Central Prison |
| prisons.records@justiceone.demo | Prison Records Officer | DEMO Ashanti Central Prison |
| prisons.records.north@justiceone.demo | Prison Records Officer | DEMO Northern Central Prison |
| prisons.hr@justiceone.demo | Prison HR Officer | Prisons Service Headquarters |
| auditor@justiceone.demo | Auditor | All audit events, read-only |
| applicant@justiceone.demo | Public Applicant | Own applications only |

## Tests

API security tests need a migrated and seeded database named in `DATABASE_URL_TEST` (default `justiceone_test` on localhost).

```bash
pnpm --filter @justiceone/api test
```

Browser tests need the API and web app running.

```bash
pnpm e2e
```

If Chromium is pre-installed rather than fetched by Playwright, set `PW_CHROMIUM_PATH` to its executable.

## Docker

```bash
docker compose up --build
```

Starts PostgreSQL, runs migrations and the seed, then the API and web app. The container files were written without a Docker daemon available and have **not yet been run**; verifying them is a Day 5 task.

## Deployment (demonstration environment)

1. Provision PostgreSQL 16 and two containers (API, web) in an environment approved for synthetic data.
2. Set the variables from `.env.example`; set `COOKIE_SECURE=true` and `WEB_ORIGIN` to the public HTTPS origin.
3. Expose only the web container publicly; the API stays on the private network behind the web proxy.
4. Run `pnpm db:migrate` then `pnpm db:seed` once.
5. Keep the environment separate from development and never load real data.

## Known limitations

- Background checks are read-only until Day 4.
- Browser tests write to the development database (each run creates synthetic persons and prisoners, and moves one police officer).
- No multi-factor authentication, password reset or user-provisioning screens.
- Sessions are stored in PostgreSQL; no idle timeout separate from the 8-hour expiry.
- Document upload is modelled (`documents`) but not implemented.
- Rank catalogues were read as excerpts of C.I. 76 and C.I. 92; confirm against gazette copies. Appointment titles and several abbreviations are provisional or unconfirmed (shown in the product).
- Demo stations and prisons are fictional. The official register of prison establishments is not loaded because published lists disagree.
- The 48-hour indicator and all sentence dates are stored values; the system makes no legal determination.
- Not security-accredited, not penetration-tested, not assessed under the Data Protection Act, 2012 (Act 843). Not for real records.
