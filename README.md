# Sentinel Cyber — Anti-Fraud Monitoring Dashboard

A full-stack anti-fraud trading monitoring dashboard built with **Node.js + Express + SQLite + EJS**.

![Dashboard](https://img.shields.io/badge/Node.js-Express-green?style=flat-square)
![Database](https://img.shields.io/badge/Database-SQLite-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Overview

Sentinel Cyber is a dark-themed fraud monitoring command center for trading platforms. It provides real-time visibility into alerts, cases, detection rules, analytics, and team settings — all backed by a local SQLite database.

**Design system:** Sentinel Cyber ("The Vigilant Lens") — dark background `#0c0e12`, electric blue accents `#b0c6ff`, Manrope + Inter typography.

---

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards (total alerts, active cases, blocked accounts, avg risk score), 24h alert volume SVG chart with spike detection, recent alerts mini-table, severity distribution |
| **Alerts** | Full alert table with severity/status/type filters, pagination, View modal, Acknowledge, Dismiss actions |
| **Cases** | Case management table with risk level badges, analyst assignment, Open Case modal with ownership/escalation |
| **Rules Engine** | Detection rules grouped by category (Transaction / Account / Network), toggle active/inactive, Edit/Duplicate/Delete, Create Rule modal |
| **Reports** | SVG charts — severity donut, detection method bars, 24h volume chart, downloadable report list |
| **Settings** | 5 tabs: General, Notifications, Integrations, Team, Security — all interactive |

---

## Tech Stack

- **Backend:** Node.js, Express 4, EJS templating
- **Database:** SQLite via `better-sqlite3` (synchronous, zero-config)
- **Frontend:** Vanilla JS, inline SVG charts, CSS custom properties
- **UI Design:** Custom dark theme based on Stitch MCP / Google Gemini generated mockups

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/kuznetsov-ai/sentinel-cyber.git
cd sentinel-cyber
npm install
```

### Seed the database

```bash
node db/seed.js
```

This creates `db/sentinel.db` with:
- 120 realistic fraud alerts
- 60 investigation cases
- 8 detection rules (Transaction, Account, Network categories)
- 24-hour alert timeline with spike events

### Run

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open **http://localhost:3333**

---

## Project Structure

```
sentinel-cyber/
├── server.js              # Express app — routes, REST API, EJS rendering
├── db/
│   ├── schema.sql         # SQLite table definitions
│   ├── db.js              # Database singleton (better-sqlite3)
│   └── seed.js            # Demo data generator
├── views/
│   ├── layout.ejs         # Shared layout: sidebar, topbar, CSS design system
│   ├── dashboard.ejs      # KPI cards + SVG timeline chart
│   ├── alerts.ejs         # Filterable alerts table + pagination
│   ├── cases.ejs          # Cases table with status summary
│   ├── rules.ejs          # Rule cards grouped by category
│   ├── reports.ejs        # SVG analytics charts
│   └── settings.ejs       # 5-tab settings page
├── public/
│   └── interactivity.js   # Global JS: toggles, modals, toasts, notifications, profile
└── testMe/
    └── ui_test_scenarios.py  # TITAN E2E test suite (15 scenarios)
```

---

## REST API

All mutations go through the REST API and persist to SQLite.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/alerts/:id` | Update alert status (`New` / `Acknowledged` / `Resolved`) |
| `DELETE` | `/api/alerts/:id` | Delete an alert |
| `PATCH` | `/api/cases/:id` | Update case status |
| `PATCH` | `/api/rules/:id/toggle` | Toggle rule active/inactive |
| `DELETE` | `/api/rules/:id` | Delete a rule |
| `POST` | `/api/rules` | Create a new rule |

---

## Database Schema

```sql
-- alerts: fraud detection events
alerts (id, alert_code, timestamp, account_uuid, account_name,
        alert_type, severity, details, status)

-- cases: investigation workflow
cases  (id, case_code, created_at, account_uuid, account_email,
        risk_level, detection_method, assigned_to, last_updated, status)

-- rules: detection rule configuration
rules  (id, name, type, category, priority, active, trigger_count, last_modified)

-- timeline: 24-hour hourly alert volumes
timeline (id, hour, count, is_spike, spike_label)
```

---

## E2E Tests

Tests use [TITAN](https://github.com/kuznetsov-ai) — a Playwright-based E2E framework.

```bash
cd /path/to/titan
.venv/bin/python3 cli.py test \
  --system config/systems/sentinel-cyber.yaml \
  --scenario sentinel-cyber \
  --headed
```

**Results:** 15/15 PASS — covers all pages, all buttons, all modals, all table actions.

---

## Interactive Elements

Every UI element is functional:

- **Toggles** — persist state via `PATCH /api/rules/:id/toggle`
- **Alert actions** — View (modal with details), Acknowledge (status change), Dismiss (DELETE)
- **Cases** — Open Case modal with Take Ownership / Escalate actions
- **Rules Engine** — Create, Edit, Duplicate, Delete rules
- **Notifications bell** — Dropdown with live alert feed
- **Profile** — Dropdown with Profile settings, Preferences, API Keys modals
- **Settings tabs** — General, Notifications, Integrations, Team, Security (all with content)
- **Form saves** — Toast confirmations

---

## Screenshots

> Dashboard with 120 alerts, SVG timeline chart, KPI cards

---

## License

MIT
