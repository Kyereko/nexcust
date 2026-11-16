# JusticeOne — working agreement for AI coding sessions

- **GitHub:** the default account for all Fourth IT / EOK work is **Kyereko**. This project's home repository is under `github.com/Kyereko`. Do not push this project to any other account.
- **Product owner:** Fourth IT. Demonstration prototype; synthetic data only. Never present it as an official Ghana Police Service or Ghana Prisons Service system.
- **Contracts:** `packages/contracts` (roles, permissions) and `packages/database/prisma/schema.prisma` are authoritative. Change them deliberately and update `docs/01` and `docs/02`.
- **Institutional facts** (ranks, appointments, units, establishment types) are reference data with an evidence status; see `docs/research`. Never hard-code them in logic.
- **Legal decisions** (detention, guilt, sentence, release) are recorded from a named human; the system never computes them.
- **Every route** declares a permission; every query applies the caller's org-unit scope; refusals are audited.
- **Before committing:** `pnpm typecheck`, `pnpm --filter @justiceone/api test`, and the Playwright suite (`pnpm e2e`).
