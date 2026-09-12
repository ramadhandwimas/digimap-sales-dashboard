# M238 Digimap PIM 2 Dashboard

Dashboard internal M238 Digimap Pondok Indah Mall 2.

## Production scope

- M238 only.
- Do not mix M238 data sources, routes, config, cache, or business logic with Jakarta 1.
- Sales 2026 source: `Data Copas`.
- Sales 2025 source: `Data Copas Archive`.
- Store filter: `M238`.

## Build

```bash
npm ci
npm run build
npm run lint
```

Vercel uses:

```bash
npm run build:vercel
```

## Hardening notes

The M238 hardening branch fixes deterministic Google Sheets clear/write ordering, period-specific sales sheet selection, and stale root build scripts. Destructive and upload API authorization still requires the production authentication mechanism to be available server-side; do not hardcode secrets in this public repository.

Before production merge, verify the preview deployment and Google Sheets access for both a 2025 month and a 2026 month, then exercise SPW/SOH upload using a disposable test range or test workbook.
