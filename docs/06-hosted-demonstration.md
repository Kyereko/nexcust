# 06 — Hosted Demonstration Environment

Private demonstration of NEXCUST for Fourth IT. Synthetic data only.

## Architecture

```
Browser ── https://nexcust.fourthit.com ──▶ Vercel project nexcust-web (Next.js, region lhr1)
                                             │  middleware: password gate + /api proxy
                                             │  adds x-nexcust-gateway (shared secret) and x-nexcust-client-ip
                                             ▼
                                       Vercel project nexcust-api (NestJS as a Vercel Function, lhr1)
                                             │  rejects any request without the gateway secret (404)
                                             ▼
                                       Supabase project nexcust-demo (Postgres 17, London eu-west-2)
                                          schema `nexcust`, role `nexcust_app` (no access to other schemas;
                                          not exposed through the Supabase data API)
```

| Item | Value |
|---|---|
| Public address | `https://nexcust.fourthit.com` (DNS: CNAME `nexcust` → `cname.vercel-dns.com` in AWS Route 53) |
| Access | 1) password prompt for the whole site (`DEMO_GATE_USER` / `DEMO_GATE_PASSWORD`), 2) NEXCUST sign-in |
| `*.vercel.app` URLs | Web: Vercel login required. API: unusable without the gateway secret |
| Database connections | Runtime: Supavisor transaction pooler (6543). Migrations: session pooler (5432) via `DIRECT_URL` |
| Deploys | Every push to `main` on `Kyereko/nexcust`. The API build applies migrations and seeds synthetic data if the database is empty (otherwise only re-syncs roles and permissions) |

## Environment variables

| Project | Variable | Notes |
|---|---|---|
| nexcust-api | `DATABASE_URL`, `DIRECT_URL` | Sensitive. Restricted role, schema `nexcust` |
| nexcust-api | `API_GATEWAY_SECRET` | Sensitive. Must equal the web value |
| nexcust-api | `DEMO_PASSWORD` | Sensitive. Password for the demo accounts, applied at first seed |
| nexcust-api | `COOKIE_SECURE=true`, `WEB_ORIGIN` | Allowed origins for state-changing requests |
| nexcust-web | `API_INTERNAL_URL` | Production URL of nexcust-api |
| nexcust-web | `API_GATEWAY_SECRET` | Sensitive |
| nexcust-web | `DEMO_GATE_USER`, `DEMO_GATE_PASSWORD` | Password prompt for the private demo |

Secrets are held only in Vercel (sensitive variables) and are never committed.

## Known limits of the demo tier

- Rate limiting is per function instance (in memory); adequate for a private demonstration, not for production.
- Single region (London) for app and database; latency from Accra is acceptable for a demonstration.
- Not security-accredited; production would move to a Government of Ghana-approved environment (see `docs/research/13-data-protection-hosting-procurement.md`).

## Resetting the demonstration data

Run against the hosted database with the restricted role (from a machine that can reach the pooler):
`pnpm --filter @nexcust/database reset` with `DATABASE_URL`/`DIRECT_URL` set to the hosted values. This drops and rebuilds the synthetic data.
