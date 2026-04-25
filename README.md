# Sentinel Cyber — Anti-Fraud Monitoring Dashboard

A full-stack anti-fraud trading monitoring dashboard built with **Node.js + Express + SQLite + EJS**.

**Live demo:** https://sentinel.ekuznetsov.dev — every visitor gets their own randomly-seeded sandbox.

![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat-square)
![Database](https://img.shields.io/badge/Database-SQLite-blue?style=flat-square)
![Demo](https://img.shields.io/badge/Demo-per--session_sandbox-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Overview

Sentinel Cyber is a dark-themed fraud monitoring command center for trading platforms. It provides real-time visibility into alerts, cases, detection rules, analytics, and team settings — all backed by a local SQLite database.

**Design system:** "The Vigilant Lens" — dark background `#0c0e12`, electric blue accents `#b0c6ff`, Manrope + Inter typography.

**Responsive:** desktop layout collapses to a 64px icon rail (toggle lives at the bottom of the sidebar — `← Collapse` / `→ Expand`, persisted in `localStorage`). Phones (≤860px) get a slide-in drawer with backdrop, KPI grid drops to 2 columns, non-essential alert columns hide, and SVG charts auto-size their viewBox to the data so nothing leaks past the card edge.

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards (total alerts, active cases, blocked accounts, avg risk score), 24h alert volume SVG chart with spike detection, recent alerts mini-table, severity distribution |
| **Alerts** | Full alert table with severity/status/type filters, pagination, View modal, Acknowledge, Dismiss actions |
| **Cases** | Case management table with risk level badges, analyst assignment, Open Case modal with ownership/escalation |
| **Rules Engine** | Detection rules grouped by category (Transaction / Account / Network), toggle active/inactive, Edit/Duplicate/Delete, Create Rule modal |
| **Reports** | SVG charts — severity donut, detection method bars, 24h volume chart, downloadable report list |
| **Settings** | 5 tabs: General, Notifications, Integrations, Team, Security — all interactive |

## Live demo — per-session sandbox

The public demo on `sentinel.ekuznetsov.dev` is read-write but isolated:

- The first request issues a `sentinel_sid` cookie.
- That sid seeds a deterministic PRNG (FNV-1a → mulberry32) in `db/seed.js`, so every visitor gets a **unique** dataset — different alert volumes, different fraud types, different spike hours, different analysts assigned to cases.
- All mutations (Acknowledge alert, Toggle rule, Open case) write to **your own** SQLite file at `db/sessions/<sid>.db` — they don't leak to other visitors.
- The **Reset demo** button issues a fresh sid and a fresh dataset.
- Idle session files older than 24h are deleted by an in-process sweeper.

Architecture details: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

- **Backend:** Node.js 22, Express 4, EJS templating
- **Database:** SQLite via `better-sqlite3` (synchronous, zero-config, WAL mode)
- **Frontend:** Vanilla JS, inline SVG charts, CSS custom properties
- **Auth/Session:** signed-style hex cookie + per-session SQLite file

## Getting Started

```bash
git clone https://github.com/kuznetsov-ai/sentinel-cyber.git
cd sentinel-cyber
npm install
npm start
# → http://localhost:3333
```

The first browser hit creates `db/sessions/<sid>.db` and seeds it with a unique dataset. No manual seed step required.

To poke at the seed schema in isolation:

```bash
node db/seed.js my-test-sid   # writes db/sentinel.db with that sid as RNG seed
```

### Configuration

Environment variables (all optional):

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `3333` | HTTP port |
| `SENTINEL_SESSIONS_DIR` | `db/sessions` | Where per-session sqlite files live |
| `SENTINEL_SESSION_TTL_MS` | `86400000` (24h) | Idle TTL before a sandbox is wiped |
| `SENTINEL_SESSION_SWEEP_MS` | `3600000` (1h) | How often the sweeper runs |
| `SENTINEL_MAX_HANDLES` | `500` | Max open SQLite handles in memory (LRU eviction) |

## Project Structure

```
sentinel-cyber/
├── server.js                # Express app — routes, REST API, EJS rendering, sid middleware
├── db/
│   ├── schema.sql           # SQLite table definitions
│   ├── prng.js              # FNV-1a hash + mulberry32 (deterministic PRNG)
│   ├── seed.js              # Per-sid demo data generator (alerts/cases/rules/timeline)
│   ├── db.js                # Per-session sandbox factory + sweeper
│   └── sessions/            # Runtime: <sid>.db files (gitignored)
├── views/
│   ├── layout.ejs           # Shared layout: sidebar, topbar, demo banner, design system
│   ├── dashboard.ejs        # KPI cards + SVG timeline chart
│   ├── alerts.ejs           # Filterable alerts table + pagination
│   ├── cases.ejs            # Cases table with status summary
│   ├── rules.ejs            # Rule cards grouped by category
│   ├── reports.ejs          # SVG analytics charts
│   └── settings.ejs         # 5-tab settings page
├── public/
│   └── interactivity.js     # Toggles, modals, toasts, notifications, profile, demo reset
├── docs/
│   └── ARCHITECTURE.md      # Per-session sandbox + deployment details
└── testMe/
    └── ui_test_scenarios.py # TITAN E2E test suite
```

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/alerts/:id` | Update alert status (`New` / `Acknowledged` / `Resolved`) |
| `DELETE` | `/api/alerts/:id` | Delete an alert |
| `PATCH` | `/api/cases/:id` | Update case status |
| `PATCH` | `/api/rules/:id/toggle` | Toggle rule active/inactive |
| `DELETE` | `/api/rules/:id` | Delete a rule |
| `POST` | `/api/rules` | Create a new rule |
| `POST` | `/api/demo/reset` | Wipe this session's sandbox, issue a new sid + dataset |
| `GET` | `/api/demo/info` | `{sid, ttl_hours}` |

All mutating endpoints scope to the caller's `sentinel_sid` cookie — there is no global state.

## Database Schema

```sql
alerts   (id, alert_code, timestamp, account_uuid, account_name,
          alert_type, severity, details, status)
cases    (id, case_code, created_at, account_uuid, account_email,
          risk_level, detection_method, assigned_to, last_updated, status)
rules    (id, name, type, category, priority, active, trigger_count, last_modified)
timeline (id, hour, count, is_spike, spike_label)
```

## Deployment (sentinel.ekuznetsov.dev)

Hosted on Silver Server (Hetzner) behind Caddy, served by a `sentinel` system user via `systemd`. `Set-Cookie` flips on `Secure` when `NODE_ENV=production`.

**Auto-deploy on push to `main`** via GitHub Actions (`.github/workflows/deploy.yml`):
SSH to Silver as a restricted `sentinel-deploy` user (write access only to `/opt/sentinel-cyber` via setgid + group membership; NOPASSWD sudo limited to `systemctl restart sentinel-cyber`), `rsync` (no `--delete` — keeps `.env`, `server.log`, `db/sessions/`), `npm ci --omit=dev`, restart, smoke-test the public URL with up to 5 retries.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full path.

## Tests

`testMe/ui_test_scenarios.py` — 19 Titan/Playwright scenarios covering pages, actions, and the demo sandbox. Highlights:

- **S16** walks 6 routes × 3 viewports (393 / 768 / 1440), checks `scrollWidth ≤ innerWidth + 4`, then walks every `.sc-card` and asserts its right edge stays inside the viewport (catches layouts that *would* horizontally scroll if `body { overflow-x: hidden }` weren't masking it).
- **S17** mobile drawer: burger opens, backdrop click closes, nav-link click closes.
- **S18** desktop collapse: chevron toggles 240px ↔ 64px, state persists across reload.
- **S19** demo reset: `POST /api/demo/reset` rotates the cookie and the full KPI tuple changes.

```bash
# from the titan checkout
.venv/bin/python3 cli.py test \
  --system config/systems/sentinel-cyber.yaml \
  --scenario sentinel-cyber
```

## License

MIT
