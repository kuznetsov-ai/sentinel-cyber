# Sentinel Cyber — Architecture

## High-level

```
Browser ── HTTPS ──▶ Caddy (Silver Server)
                       │
                       └──▶ reverse_proxy localhost:3400
                               │
                               └──▶ Node 22 (systemd: sentinel-cyber.service)
                                       │
                                       ├── Express + EJS + interactivity.js
                                       └── better-sqlite3
                                              │
                                              └── db/sessions/<sid>.db   (one file per visitor)
```

## The per-session sandbox

The whole point of the public demo is that anyone can click "Acknowledge", "Toggle rule", or "Delete case" without stepping on other visitors. Three pieces make that work:

### 1. Cookie-issued session id

`server.js` runs a tiny middleware on every request:

- Parse `Cookie:` header.
- If `sentinel_sid` is missing or malformed, mint a new one (`crypto.randomBytes(8).toString('hex')`) and issue `Set-Cookie` with `Max-Age = 24h`, `HttpOnly`, `SameSite=Lax`.
- Stash `req.sid` and `req.db` for the route handlers.

There is no auth — the cookie is purely a sandbox key.

### 2. Deterministic PRNG seed

`db/prng.js` exposes `makeRng(sid)`:

- FNV-1a 32-bit hashes the sid string into a 32-bit integer.
- That integer seeds a [mulberry32](https://stackoverflow.com/a/47593316) PRNG.
- Every `rng()` call returns a 0..1 float, exactly like `Math.random()` but reproducible.

So `sid → hash → seed → rng()` is a pure function. Same sid always produces the same dataset.

### 3. Per-sid SQLite file + factory

`db/db.js` is the only thing that knows about the sandbox:

```js
function getSessionDb(sid) {
  if (cache.has(sid)) return cache.get(sid).db; // hot
  const dbPath = path.join(SESSIONS_DIR, `${sid}.db`);
  const isFresh = !fs.existsSync(dbPath);
  const db = new Database(dbPath);            // better-sqlite3
  db.pragma('journal_mode = WAL');
  if (isFresh) {
    db.exec(SCHEMA_SQL);
    seedDatabase(db, sid);                    // fills via mulberry32(sid)
  }
  cache.set(sid, { db, lastUsed: Date.now() });
  return db;
}
```

The cache caps at `SENTINEL_MAX_HANDLES` (default 500); when full, the oldest handle is closed (LRU). This keeps fd count bounded under load.

### 4. Sweeper

A `setInterval` fires every `SENTINEL_SESSION_SWEEP_MS` (default 1h):

- Closes cached handles idle for more than `SENTINEL_SESSION_TTL_MS` (default 24h).
- `unlink`s `<sid>.db` / `.db-shm` / `.db-wal` files older than the same TTL.

The timer is `unref()`ed so it doesn't keep the process alive.

### 5. Reset

`POST /api/demo/reset`:

1. `resetSessionDb(req.sid)` — close handle, unlink files.
2. Mint a fresh sid, set the cookie.
3. Return `{ok: true, sid}`.

Because the seed is `hash(sid)`, a fresh sid means a fresh distribution — different alert volumes, different spike hours, different analyst rotations.

## Data variety knobs

`db/seed.js` is intentionally noisy on purpose so two visitors don't see the same dashboard:

- 100–160 alerts (varies per session).
- 40–80 cases.
- 8–12 rules drawn at random from a 14-rule bank.
- 1–3 spike hours, randomly placed between 08:00 and 22:00.
- 12 alert types, 12 high-risk countries, 13 analyst names, 9 email domains.
- Severity distribution is weighted (Critical 10%, High 25%, Medium 40%, Low 25%) but the actual counts come out different on every seed.

## Why SQLite per session, not Postgres + tenancy column?

- Demo, not prod. We want zero-config and trivial cleanup (`unlink` the file).
- `better-sqlite3` is synchronous; route handlers stay simple, no awaits.
- WAL mode means readers don't block writers within a single session.
- File-per-tenant is fundamentally simpler than row-level tenancy and removes any risk of cross-tenant leaks via a missing `WHERE sid=?`.

## Deployment

### Server

Silver Server (`89.167.108.210`, Hetzner CX22 / Ubuntu).

```
/opt/sentinel-cyber/
├── server.js, package.json, ...   (rsync'd from local)
├── node_modules/                   (npm ci --omit=dev)
├── .env                            (PORT=3400)
├── db/sessions/                    (runtime, owned by sentinel:sentinel)
└── server.log                      (stdout + stderr)
```

### systemd

`/etc/systemd/system/sentinel-cyber.service`:

```ini
[Service]
Type=simple
User=sentinel
Group=sentinel
WorkingDirectory=/opt/sentinel-cyber
EnvironmentFile=/opt/sentinel-cyber/.env
ExecStart=/usr/bin/node /opt/sentinel-cyber/server.js
Restart=on-failure

# Hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/opt/sentinel-cyber
```

The `sentinel` user is system-only (`useradd --system --no-create-home --shell /usr/sbin/nologin`). `ProtectHome=yes` and `ProtectSystem=strict` mean the process can only write under `/opt/sentinel-cyber`.

### Caddy

```
sentinel.ekuznetsov.dev {
    reverse_proxy localhost:3400
}
```

Caddy auto-issues a Let's Encrypt cert via HTTP-01 challenge and renews on its own. No manual TLS cron.

### DNS

Cloudflare zone `ekuznetsov.dev`:

- `A sentinel → 89.167.108.210`, **proxied=false** (DNS-only, so HTTP-01 challenge can hit Caddy directly).

### Redeploy

Push to `main`. That's it.

`.github/workflows/deploy.yml` triggers on every push and on manual `workflow_dispatch`. Steps:

1. Checkout.
2. Drop the SSH private key from the `SENTINEL_DEPLOY_KEY` repo secret into `~/.ssh/id_ed25519`, fingerprint Silver into `known_hosts`.
3. `rsync -az` to `sentinel-deploy@89.167.108.210:/opt/sentinel-cyber/`, excluding `node_modules`, `.git`, `.github`, `.env`, local `db/sentinel.db*` files, and the `db/sessions/` runtime tree. **No `--delete`** — first iteration of the workflow used it and ate `/opt/sentinel-cyber/.env`, the systemd `EnvironmentFile`, breaking startup. The exclude list also keeps server-only state alive.
4. `ssh sentinel-deploy@…` runs `npm ci --omit=dev` then `sudo /usr/bin/systemctl restart sentinel-cyber`. No `chown` step — see below.
5. Smoke-test: `curl https://sentinel.ekuznetsov.dev/`, retry up to 5× with 3s gaps.

**Filesystem ownership model** (the bit that took two failed deploys to get right):

- `/opt/sentinel-cyber/` is owned by `sentinel-deploy:sentinel` with `g+rwX` and the directory `setgid` bit set.
- `sentinel-deploy` is the rsync owner, so it can `set times` (rsync's `-a` archive mode) without permission errors.
- `sentinel` (the systemd user) is a member of group `sentinel` and reads/writes through group permissions; new files created by the service inherit `group=sentinel` via setgid.
- The previous workflow re-chowned to `sentinel:sentinel` after every deploy. That stripped `sentinel-deploy`'s ability to update mtimes on the next push, exit 23. Removed.

The `sentinel-deploy` user is intentionally restricted:

- **No shell login** beyond what rsync/ssh-exec needs.
- **Write access** scoped to `/opt/sentinel-cyber/`.
- **Sudoers** allow only:
  - `/usr/bin/systemctl restart sentinel-cyber`
  - `/usr/bin/systemctl reload sentinel-cyber`

A leaked deploy key cannot escalate beyond redeploying this service.

**Manual deploy** (only for emergencies, when CI is broken):

```bash
rsync -az \
  --exclude=node_modules --exclude=.git --exclude=.github --exclude=.env \
  --exclude='db/sentinel.db*' --exclude='db/sessions' \
  ./ sentinel-deploy@89.167.108.210:/opt/sentinel-cyber/
ssh sentinel-deploy@89.167.108.210 '
  cd /opt/sentinel-cyber &&
  npm ci --omit=dev &&
  sudo /usr/bin/systemctl restart sentinel-cyber
'
```

## Responsive layout

The same shell adapts to phones, tablets, and desktop without changing route HTML:

- **Breakpoint:** `860px`. Below → mobile mode, above → desktop.
- **Desktop** (default): persistent 256px sidebar, topbar with search. A chevron button at the bottom of the sidebar collapses it to a 64px icon rail (`← Collapse` / `→ Expand`); state persists in `localStorage('sentinel.sidebar.collapsed')`. The `.nav-label` spans hide and the logo swaps to a `shield_lock` glyph.
- **Mobile** (`≤860px`): sidebar becomes an off-canvas drawer (`transform: translateX(-100%)` + `contain: paint`), opened by a burger in the topbar and dismissed by tapping the `#sidebar-backdrop` overlay or any nav link. Search input hides; KPI grid drops to 2 columns; page-header action clusters wrap.
- **Anti-overflow defences** (each catches a different class of bug):
  1. `html, body { overflow-x: hidden }` on phones — last-line clip so a subtle leak never produces a horizontal scrollbar.
  2. `.sc-card, .sc-kpi, .sc-table-wrap { min-width: 0; max-width: 100% }` — without this, a wide table inside a CSS-grid card stretches the card past the viewport (the body clip then *masks* it, hiding content behind the right edge instead of producing scroll).
  3. `[style*="grid-template-columns"] { grid-template-columns: 1fr !important }` on phones — flattens any inline 2-/3-column grid (dashboard's `1fr 280px`, settings' `200px 1fr`, reports' `260px 1fr 1fr`) without per-page rewrites.
  4. SVG charts compute their `viewBox` width from the data length and use `display: block` instead of `overflow: visible` so axis bars never paint past the SVG bounds.
  5. Non-essential table columns marked `.col-hide-mobile` (e.g. dashboard Recent Alerts → Account, Type) are hidden, leaving Alert ID + Severity + Status legible inside the card.
- **Breakpoint-cross handling:** a `matchMedia('change')` listener clears the irrelevant class when the viewport crosses 860px (drops `sidebar-collapsed` entering mobile, drops `sidebar-open` returning to desktop, restores persisted collapse state).

The Titan suite asserts both layers: `S16` walks 6 routes × 3 viewports and fails if `scrollWidth > innerWidth + 4` *or* if any `.sc-card` extends past `window.innerWidth + 4`. The second check is what catches the body-clip-masks-overflow class of bug.

## Security boundaries

- Sandbox isolation is by **filesystem**, not by SQL `WHERE`. A bug that omits `req.db` would 500 or crash the request — it cannot leak rows from another session.
- Cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` when `NODE_ENV=production` (Caddy auto-HTTPS terminates TLS at the edge but the browser still needs the flag).
- All input goes through `better-sqlite3` parameterized statements (`db.prepare(...).run(?)` / `.get(?)` / `.all(?)`); no string interpolation into SQL.
- No file uploads, no SSRF surface, no auth so no credential leak path.
- Worst case for a malicious visitor: fill their own `db/sessions/<sid>.db` with junk and trigger sweeper churn. Bounded by `SENTINEL_MAX_HANDLES` and disk.

## What this demo doesn't do

Not in scope (would change the architecture):

- Real-time push (would need WebSocket / SSE).
- Multi-user analyst roles (would need real auth, not sandbox cookies).
- Cross-session aggregate reports (sandbox model rules them out by design).
- Persistence beyond 24h (sweeper deletes it; intentional for demo cost control).
