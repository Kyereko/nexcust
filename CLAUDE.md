# NEXCUST — working agreement for AI coding sessions

NEXCUST — Connected Institutions. Trusted Records. Powered by Fourth IT.

- **GitHub:** the default account for all Fourth IT / EOK work is **Kyereko**. This project's home repository is `github.com/Kyereko/nexcust`. Do not push this project to any other account (a temporary backup branch on jayweb-aws/fourth-tech-hub was used before the move, with the owner's approval).
- **Product owner:** Fourth IT. Prototype: police units and prison establishments are the Services' published lists (`docs/research/15`, each with its evidence status); every person, officer, case and custody record is synthetic, with `NX-` references and `GHA-NX…` identity numbers that cannot match a real card. No "DEMO" labels (owner's decision, 16 Nov 2026), but keep the discreet "Prototype · synthetic records" note in the app shell, "synthetic records" on dashboards, and the SPECIMEN — NOT VALID watermark on certificates. Never present it as an official Ghana Police Service or Ghana Prisons Service system.
- **Contracts:** `packages/contracts` (roles, permissions) and `packages/database/prisma/schema.prisma` are authoritative. Change them deliberately and update `docs/01` and `docs/02`.
- **Institutional facts** (ranks, appointments, units, establishment types) are reference data with an evidence status; see `docs/research`. Never hard-code them in logic.
- **Legal decisions** (detention, guilt, sentence, release) are recorded from a named human; the system never computes them.
- **Every route** declares a permission; every query applies the caller's org-unit scope; refusals are audited.
- **Before committing:** `pnpm typecheck`, `pnpm --filter @nexcust/api test`, and the Playwright suite (`pnpm e2e`).
- **Design standard:** follow `docs/05-brand-identity.md` — Deep Forest Green `#174D38` leads, Muted Gold `#C5A34A` only as a sparing accent (never text on light backgrounds), Warm White `#FAFAF7` canvas, Soft Gray `#F2F3F0` cards, Charcoal `#252525` text, Soft Sage `#E8F0E9` highlights, chart marks `#1E7B57`. One identity for Police and Prisons. No badges, seals, insignia, gradients or shadows. Use the theme tokens, not raw hex.
