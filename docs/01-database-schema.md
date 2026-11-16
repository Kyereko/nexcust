# 01 — Database Schema and Entity Relationships

Authoritative source: `packages/database/prisma/schema.prisma` (51 tables). Migrations: `packages/database/prisma/migrations/`. This document explains the shape; the schema file wins on any difference.

## 1. Domains

| Domain | Tables |
|---|---|
| Reference (configurable, evidence-tagged) | `institutions`, `regions` (geography only), `org_unit_types`, `organizational_units`, `facility_types`, `facilities`, `housing_units`, `ranks`, `appointments` |
| Identity & access | `users`, `sessions`, `invitations`, `roles`, `permissions`, `role_permissions`, `user_role_assignments` |
| Shared services | `persons`, `person_identifiers`, `documents`, `audit_events`, `approval_requests`, `data_exchange_requests` |
| Police | `police_personnel`, `police_postings`, `police_rank_history`, `police_command_assignments`, `police_incidents`, `police_cases`, `police_case_persons`, `arrests`, `charges`, `conviction_records`, `police_custody_episodes`, `custody_movements`, `background_check_applications`, `background_check_reviews`, `clearance_certificates` |
| Prisons | `prison_personnel`, `prison_postings`, `prison_rank_history`, `prison_command_assignments`, `prisoner_records`, `court_orders`, `prison_admissions`, `prison_custody_episodes`, `prison_transfers`, `sentence_records`, `prison_releases`, `prison_incidents`, `rehabilitation_programmes`, `rehabilitation_enrollments` |

## 2. Key relationships

```
institutions ─┬─ org_unit_types ── organizational_units (self-referencing tree, materialised path)
              ├─ facility_types ── facilities ── housing_units
              ├─ ranks
              └─ appointments

users ── user_role_assignments ── roles ── role_permissions ── permissions
                     └── organizational_units   (jurisdiction = this unit and its subtree)

persons ─┬─ person_identifiers
         ├─ arrests ── police_custody_episodes ── custody_movements
         ├─ police_case_persons ── police_cases ── charges ── conviction_records
         ├─ background_check_applications ── reviews / clearance_certificates
         └─ prisoner_records ─┬─ prison_admissions ── prison_custody_episodes ─┬─ prison_transfers
                              ├─ sentence_records                              └─ prison_releases
                              └─ rehabilitation_enrollments
court_orders ── admissions / sentences / transfers / releases   (legal authority for every prison event)

*_personnel ─┬─ currentRank → ranks          + *_rank_history
             ├─ currentOrgUnit → org units   + *_postings (from → to, maker–checker statuses)
             └─ *_command_assignments → appointments × org units
```

## 3. Rules enforced in the database

| Rule | Mechanism |
|---|---|
| UUID keys, timestamps | Every table |
| No hard deletes of justice records | `onDelete: Restrict` on all foreign keys; no delete endpoints; arrests carry `voidedAt` / `voidReason` |
| Audit trail cannot be altered | Trigger blocks `UPDATE`/`DELETE` on `audit_events` (and `custody_movements`) |
| One open police custody episode per person | Partial unique index where `status = 'IN_CUSTODY'` |
| One open prison custody episode per prisoner | Partial unique index where status is `IN_CUSTODY` or `IN_TRANSIT` |
| One current posting per officer | Partial unique index where `status = 'CONFIRMED'` and `effectiveTo IS NULL` |
| Transfer must change establishment | `CHECK (fromFacilityId <> toFacilityId)` |
| Identifier uniqueness | `UNIQUE (type, value)` on `person_identifiers` |
| Arrest ≠ charge ≠ conviction | Three tables; only `conviction_records` (from a court document) represents a conviction |

## 4. Jurisdiction model

`organizational_units.path` is `/<root>/<…>/<id>/`. A user assigned at unit U may act on a record when the record's facility unit path starts with U's path. National HQ therefore covers the whole institution; a station covers only itself. Trees of the two institutions never share a root, so a path can never cross institutions.

## 5. Reference register and synthetic data (seed)

Institutional units are real; everything operational is synthetic.

| Item | Volume |
|---|---|
| Police units | National HQ and 2 directorates, 25 regional commands, 95 divisions, 315 districts, 959 stations and posts (924 VERIFIED, 35 PROVISIONAL), from `docs/research/15-facilities-register.md` via `packages/database/reference/facilities.ts`. Each unit keeps its evidence status and source; 700+ facilities carry a map point (`latitude`, `longitude`, `coordPrecision`: STATION, OFFICIAL_MAP or TOWN) |
| Prison establishments | Headquarters, 10 regional commands and the 46 custodial establishments (VERIFIED), with published capacities where stated |
| Persons | About 3,400 (`NX-NPI-…`, 80% with a `GHA-NX…` identifier that can never equal a real Ghana Card number) |
| Police personnel / prison personnel | 400 / 200, each with rank history and postings (`NX-GPS-…`, `NX-GPRS-…`) |
| Police | 480 incidents, cases, arrests and custody episodes spread over every regional command (70 open), charges, convictions |
| Prisons | About 2,200 admissions with warrants, scaled to each establishment's capacity (12–30%), releases, transfers, sentences, programmes |
| Background checks | 10 applications across the workflow statuses |

References created by the platform carry the `NX-` prefix. Seeded sign-in accounts are role accounts (`@nexcust.fourthit.com`) named by role and post, never after a person.
All generated from a fixed seed so every environment has identical data.
