# NEXCUST — Demonstration Prototype

**Connected Institutions. Trusted Records.**

Integrated police and prisons records management for Ghana. Powered by Fourth IT.

> **Prototype.** Police units and prison establishments are the Services' published lists (with evidence status); every person, officer, case and custody record is synthetic. NEXCUST is not an official system of the Ghana Police Service or the Ghana Prisons Service, holds no real records, and is not connected to any government system.

## What works today

- Sign-in with server-side sessions; 15 seeded role accounts across 13 roles, and email invitations for testers
- Police and Prisons workspaces with live dashboards from the database
- Custody register, case register, prisoner registry, personnel (rank / appointment / posting shown separately), stations, prison facilities and occupancy
- Access control by role **and** command-tree jurisdiction, enforced in the API
- Append-only audit trail including every refused request
- Ghana institutional reference data (ranks, appointments, unit types) with evidence status
- Police workflows: person search and registration with duplicate review, arrest and custody through to authorized closure, case management, officer posting (propose → approve → confirm)
- Prisons workflows: admission against a verified warrant, transfer (initiate → approve and dispatch → receiving establishment confirms), release (initiate → second officer authorizes), housing, rehabilitation enrollment, officer postings
- Police clearance modelled on the Ghana Police Service eServices portal: published services and fees, payment, fingerprint appointment and attendance, criminal ident, investigation, signature by an authorised signatory for the Director-General, CID, six-month validity, Ghana Post dispatch, verification at `/verify` (a NEXCUST feature; certificates are watermarked SPECIMEN — NOT VALID)
- Ghana legal alignment: rights information at arrest, 48-hour clock from arrest, police enquiry bail bonds, juveniles, Act 30 warrant forms, remand-warrant expiry flags, remission entries, release types and warrant return (see `docs/research/14`)
- Authorized exchange between police and prisons (purpose and legal basis recorded)
- Reports rolled up by regional command with monthly trends
- 72 API tests and 12 browser tests

Day 5 (hardening, deployment, demonstration pack) remains: see `docs/03-agent-execution-plan.md`.

## Structure

```
nexcust/
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
│   ├── 05-brand-identity.md
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

Password for all seeded role accounts: the value of `DEMO_PASSWORD` in `.env` (default `Demo!Pass2026`). Testers and other people are invited from Users & access and choose their own password.

| Email | Role | Jurisdiction |
|---|---|---|
| admin@nexcust.fourthit.com | Platform Administrator | Platform (no operational records) |
| police.national@nexcust.fourthit.com | Police National Administrator | National Police Headquarters |
| police.regional@nexcust.fourthit.com | Police Regional Commander | Accra Regional Police Command |
| police.station@nexcust.fourthit.com | Police Station Commander | Nima Police Station |
| police.records@nexcust.fourthit.com | Police Records Officer | Nima Police Station |
| police.records.kumasi@nexcust.fourthit.com | Police Records Officer | Manhyia Police Station |
| police.hr@nexcust.fourthit.com | Police HR Officer | National Police Headquarters |
| police.bgcheck@nexcust.fourthit.com | Background Check Officer | National Police Headquarters |
| prisons.national@nexcust.fourthit.com | Prisons National Administrator | Prisons Service Headquarters |
| prisons.superintendent@nexcust.fourthit.com | Prison Superintendent (Officer-in-Charge) | Kumasi Central Prison |
| prisons.records@nexcust.fourthit.com | Prison Records Officer | Kumasi Central Prison |
| prisons.records.north@nexcust.fourthit.com | Prison Records Officer | Tamale Central Prison |
| prisons.hr@nexcust.fourthit.com | Prison HR Officer | Prisons Service Headquarters |
| auditor@nexcust.fourthit.com | Auditor | All audit events, read-only |
| applicant@nexcust.fourthit.com | Public Applicant | Own applications only |

## Tests

API security tests need a migrated and seeded database named in `DATABASE_URL_TEST` (default `nexcust_test` on localhost).

```bash
pnpm --filter @nexcust/api test
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

## Deployment (private prototype)

Hosted privately at `https://nexcust.fourthit.com` on Vercel (web + API) with a Supabase Postgres database in London. Every push to `main` deploys. Architecture, environment variables and access controls: `docs/06-hosted-demonstration.md`.

## Known limitations

- Browser tests write to the development database (each run creates synthetic persons and prisoners, and moves one police officer).
- No multi-factor authentication, password reset or user-provisioning screens.
- Sessions are stored in PostgreSQL; no idle timeout separate from the 8-hour expiry.
- Document upload is modelled (`documents`) but not implemented.
- Rank catalogues were read as excerpts of C.I. 76 and C.I. 92; confirm against gazette copies. Appointment titles and several abbreviations are provisional or unconfirmed (shown in the product).
- Demo stations and prisons are fictional. The official register of prison establishments is not loaded because published lists disagree.
- The 48-hour indicator and all sentence dates are stored values; the system makes no legal determination.
- Not security-accredited, not penetration-tested, not assessed under the Data Protection Act, 2012 (Act 843). Not for real records.
