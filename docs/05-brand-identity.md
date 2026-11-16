# 05 — NEXCUST Brand Identity and Design Standard

**NEXCUST — Connected Institutions. Trusted Records.** Powered by Fourth IT.

Direction: modern, minimalist, institutional, neutral, premium. This is the design standard for the prototype and for every AI coding session working on it.

## Palette

| Token | Hex | Use | Rule |
|---|---|---|---|
| `brand` — Deep Forest Green | `#174D38` | Navigation, headings, primary buttons, links | Primary identity |
| `gold` — Muted Gold | `#C5A34A` | Logo "CUST", selected navigation item, focus ring, demonstration banner, hairline accents | **Sparing. Never body or link text on light surfaces** (2.35:1 on warm white) |
| `canvas` — Warm White | `#FAFAF7` | Page background | |
| `surface` — Soft Gray | `#F2F3F0` | Cards, table headers, secondary surfaces | Tables and forms sit on white for legibility |
| `ink` — Charcoal | `#252525` | Text | |
| `sage` — Soft Sage | `#E8F0E9` | Subtle highlights, hover on secondary buttons, verification panel | |
| `chart` — Chart Green | `#1E7B57` | Bars and data marks | `#174D38` fails the chart-mark lightness check; `#1E7B57` is the validated step in the same family |

Status colours (green / amber / red badges, overdue and over-capacity warnings) are **reserved for state**, always paired with a text label or icon, and are not brand colours.

All tokens live in `apps/web/app/globals.css` (`@theme`). Use the token classes (`bg-brand`, `text-gold`, `bg-surface` …), never raw hex values in components.

## Logo

- Wordmark: **NEX** in Deep Forest Green, **CUST** in Muted Gold, letter-spaced, semibold. On green navigation, NEX is warm white (inverse lockup).
- Symbol: two institution nodes joined through one shared gold node — connected institutions, one trusted record.
- White or transparent background. No gradients, shadows, shields, badges, seals or flag graphics.
- Component: `apps/web/components/brand.tsx`; favicon: `apps/web/app/icon.svg`.

## Principles

1. **Minimalist** — whitespace, simple type, restrained colour.
2. **Institutionally neutral** — no party imagery, police badges, prison insignia or government seals.
3. **Green leads, gold accents.**
4. **One identity across institutions** — NEXCUST Police and NEXCUST Prisons share the same shell; only the workspace label and dashboards differ.
5. **Ghanaian through colour and context**, not decoration.
6. **Always marked as a demonstration** while it holds synthetic data (gold banner on every page).

## Checks before shipping UI

- Text contrast: ink and brand on canvas/surface/white pass; gold is never used for text below logo size.
- Charts: one hue (`chart`), no legend for a single series, hover tooltip and a table view.
- Screens reviewed at desktop and phone widths.
