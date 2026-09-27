# Wealth Arc

Your wealth, at a glance.

A private, offline-first view of total net worth: what you have, how much of it
you added, how much the markets added, and how close you are to your goals.

It is deliberately **not** a transaction tracker, a trading terminal or an
options journal. You record one snapshot per month and Wealth Arc derives
everything else.

---

## The model

Each month you record, per account:

| Field | Meaning |
| --- | --- |
| Beginning | value at the start of the month (auto-filled from last month's close) |
| Fresh cash | new capital you moved in |
| Ending | value at the end of the month |

Everything else follows:

```
Wealth growth = Ending − Beginning − Fresh cash
Net worth     = Σ Ending across accounts
```

Returns are **time-weighted**: each month's sub-period return is chained, so
deposits and withdrawals never flatter the number.

## Screens

- **Home** — net worth, trajectory chart, wealth creation, accounts,
  allocation, performance, goals, options summary
- **History** — every snapshot, grouped by year
- **Lab** — projection with conservative / expected / optimistic scenarios
- **Goals** — milestones with progress and estimated arrival
- **More** — appearance, accounts, categories, currency, backup, reset

## Data

Everything lives in `localStorage` under `wealtharc_v5`. Nothing is sent
anywhere. Export a JSON backup from **More → Export JSON backup**.

Data written by the previous version (`wealtharc_v4`) is migrated
automatically on first load. The old key is left untouched, so the upgrade is
non-destructive.

### Schema

```jsonc
{
  "schema": 5,
  "currency": "USD",
  "theme": "system",          // system | light | dark
  "startValue": 115300,       // baseline the benchmark line starts from
  "benchmarkRate": 3,         // % per month
  "accounts":   [{ "id": "a_main", "name": "IBKR Mustafa", "archived": false }],
  "categories": [{ "id": "equities", "name": "Equities" }],
  "snapshots": [{
    "month": "2026-03",
    "accounts": { "a_main": { "begin": 121500, "fresh": 14000, "end": 130100 } },
    "planned": 14000,                        // planned capital, optional
    "allocation": { "equities": 50000 },     // optional
    "options": { "premium": 0, "pnl": 0, "capital": 0 }, // optional
    "note": ""
  }],
  "goals": [{ "id": "g_1", "name": "Half a million", "target": 500000, "date": null }],
  "projection": { "startVal": null, "contrib": 5000, "rate": 3, "years": 5 }
}
```

An account with no recorded opening balance inherits its previous closing
balance. If there is none — its first month ever — the opening is inferred as
`end − fresh`, so a newly tracked account never books growth it did not earn.

## Files

| File | Role |
| --- | --- |
| `index.html` | shell: chrome containers and script order |
| `styles.css` | design tokens and every component |
| `store.js` | schema, v4 migration, persistence, derived figures |
| `charts.js` | canvas line / bar / stacked-bar primitives |
| `views.js` | Home and History |
| `screens.js` | Lab, Goals, More and all sheets |
| `app.js` | router, chrome, theme, sheets, toasts, event wiring |
| `sw.js` | offline cache (`wealtharc-v7`) |

No build step, no dependencies. Open `index.html` or serve the folder.

## Offline

A service worker caches the shell and serves it instantly, refreshing in the
background. The app is fully usable with no network — adding and editing
snapshots writes straight to local storage.

Bump `CACHE` in `sw.js` when shipping changes so clients pick them up.

## Accessibility

Semantic landmarks, labelled controls, visible focus rings, a skip link, full
keyboard support with a focus trap in sheets, `prefers-reduced-motion`, and
text that meets WCAG AA contrast in both themes.
