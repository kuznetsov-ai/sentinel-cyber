const express = require('express');
const path    = require('path');
const ejs     = require('ejs');
const crypto  = require('crypto');

const { getSessionDb, resetSessionDb, SESSION_TTL_MS } = require('./db/db');

const app  = express();
const PORT = parseInt(process.env.PORT || '3333', 10);
const PER_PAGE = 10;
const COOKIE_NAME = 'sentinel_sid';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Per-session sandbox middleware ───────────────────────────
function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function newSid() {
  return crypto.randomBytes(8).toString('hex');
}

const COOKIE_SECURE = process.env.NODE_ENV === 'production'
  || /^(1|true|yes)$/i.test(process.env.SENTINEL_COOKIE_SECURE || '');

function cookieFlags() {
  const ttl = Math.floor(SESSION_TTL_MS / 1000);
  return `Path=/; Max-Age=${ttl}; SameSite=Lax; HttpOnly${COOKIE_SECURE ? '; Secure' : ''}`;
}

app.use((req, res, next) => {
  const cookies = parseCookies(req);
  let sid = cookies[COOKIE_NAME];
  if (!sid || !/^[a-f0-9]{6,64}$/.test(sid)) {
    sid = newSid();
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sid}; ${cookieFlags()}`);
  }
  req.sid = sid;
  req.db  = getSessionDb(sid);
  next();
});

// ── EJS render helper (injects body into layout) ─────────────
async function render(req, res, page, title, bodyData) {
  try {
    const body = await ejs.renderFile(
      path.join(__dirname, 'views', page + '.ejs'),
      bodyData
    );
    const html = await ejs.renderFile(
      path.join(__dirname, 'views', 'layout.ejs'),
      {
        title,
        page: bodyData.page || '/',
        body,
        sid_short: req.sid.slice(0, 6),
        ttl_h: Math.round(SESSION_TTL_MS / 3600000),
      }
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send(`<pre>${err.message}\n${err.stack}</pre>`);
  }
}

// ── DASHBOARD ────────────────────────────────────────────────
app.get('/', (req, res) => {
  const db = req.db;
  const totalAlerts  = db.prepare('SELECT COUNT(*) as n FROM alerts').get().n;
  const newAlerts    = db.prepare("SELECT COUNT(*) as n FROM alerts WHERE status='New'").get().n;
  const activeCases  = db.prepare("SELECT COUNT(*) as n FROM cases WHERE status IN ('Open','Under Review','Escalated')").get().n;
  const blockedToday = db.prepare("SELECT COUNT(*) as n FROM alerts WHERE severity='Critical' AND date(timestamp)=date('now')").get().n;
  const avgRisk      = db.prepare("SELECT ROUND(AVG(CASE severity WHEN 'Critical' THEN 90 WHEN 'High' THEN 65 WHEN 'Medium' THEN 35 ELSE 12 END)) as n FROM alerts").get().n;
  const timeline     = db.prepare('SELECT * FROM timeline ORDER BY hour').all();

  render(req, res, 'dashboard', 'Dashboard', {
    page: '/',
    stats: {
      total_alerts: totalAlerts, new_alerts: newAlerts,
      active_cases: activeCases, blocked_today: blockedToday,
      avg_risk_score: avgRisk, timeline,
    },
  });
});

// ── ALERTS ───────────────────────────────────────────────────
app.get('/alerts', (req, res) => {
  const db = req.db;
  const { severity = '', status = '', type = '', p = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(p) || 1);
  const offset  = (pageNum - 1) * PER_PAGE;

  const where = ['1=1'];
  const params = [];
  if (severity) { where.push('severity=?'); params.push(severity); }
  if (status)   { where.push('status=?');   params.push(status); }
  if (type)     { where.push('alert_type=?'); params.push(type); }

  const whereStr = where.join(' AND ');
  const total    = db.prepare(`SELECT COUNT(*) as n FROM alerts WHERE ${whereStr}`).get(...params).n;
  const alerts   = db.prepare(`SELECT * FROM alerts WHERE ${whereStr} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, PER_PAGE, offset);
  const types    = db.prepare('SELECT DISTINCT alert_type FROM alerts ORDER BY alert_type').all().map(r => r.alert_type);

  render(req, res, 'alerts', 'Alerts', {
    page: '/alerts', alerts, total,
    pageNum, pages: Math.ceil(total / PER_PAGE),
    filters: { severity, status, type }, types,
  });
});

// ── CASES ────────────────────────────────────────────────────
app.get('/cases', (req, res) => {
  const db = req.db;
  const { risk = '', status = '', p = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(p) || 1);
  const offset  = (pageNum - 1) * PER_PAGE;

  const where = ['1=1'];
  const params = [];
  if (risk)   { where.push('risk_level=?'); params.push(risk); }
  if (status) { where.push('status=?');     params.push(status); }

  const whereStr = where.join(' AND ');
  const total    = db.prepare(`SELECT COUNT(*) as n FROM cases WHERE ${whereStr}`).get(...params).n;
  const cases    = db.prepare(`SELECT * FROM cases WHERE ${whereStr} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, PER_PAGE, offset);
  const summary  = {
    open:         db.prepare("SELECT COUNT(*) as n FROM cases WHERE status='Open'").get().n,
    under_review: db.prepare("SELECT COUNT(*) as n FROM cases WHERE status='Under Review'").get().n,
    escalated:    db.prepare("SELECT COUNT(*) as n FROM cases WHERE status='Escalated'").get().n,
    closed:       db.prepare("SELECT COUNT(*) as n FROM cases WHERE status='Closed'").get().n,
  };

  render(req, res, 'cases', 'Cases', {
    page: '/cases', cases, total,
    pageNum, pages: Math.ceil(total / PER_PAGE),
    filters: { risk, status }, summary,
  });
});

// ── RULES ────────────────────────────────────────────────────
app.get('/rules', (req, res) => {
  const db = req.db;
  const rules = db.prepare('SELECT * FROM rules ORDER BY category, priority DESC').all();
  const stats = {
    total:           rules.length,
    active:          rules.filter(r => r.active).length,
    disabled:        rules.filter(r => !r.active).length,
    triggered_today: rules.reduce((s, r) => s + r.trigger_count, 0),
  };
  render(req, res, 'rules', 'Rules Engine', { page: '/rules', rules, stats });
});

// ── REPORTS ──────────────────────────────────────────────────
app.get('/reports', (req, res) => {
  const db = req.db;
  const bySeverity = db.prepare("SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity ORDER BY CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END").all();
  const byMethod   = db.prepare('SELECT detection_method as method, COUNT(*) as count FROM cases GROUP BY detection_method ORDER BY count DESC').all();
  const timeline   = db.prepare('SELECT hour, count FROM timeline ORDER BY hour').all();
  render(req, res, 'reports', 'Reports', { page: '/reports', charts: { by_severity: bySeverity, by_method: byMethod, timeline } });
});

// ── SETTINGS ─────────────────────────────────────────────────
app.get('/settings', (req, res) => {
  render(req, res, 'settings', 'Settings', {
    page: '/settings',
    settings: { dashboard_name: 'TAF Anti-Fraud Monitor', timezone: 'Europe/Nicosia (UTC+3)', retention_days: 90 },
  });
});

// ─────────────────────────────────────────────────────────────
// REST API (used by interactivity.js for live mutations)
// ─────────────────────────────────────────────────────────────

app.patch('/api/alerts/:id', (req, res) => {
  const { status } = req.body;
  if (!['Acknowledged', 'Resolved', 'New'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  req.db.prepare('UPDATE alerts SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/alerts/:id', (req, res) => {
  req.db.prepare('DELETE FROM alerts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/cases/:id', (req, res) => {
  const { status } = req.body;
  if (!['Open', 'Under Review', 'Escalated', 'Closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  req.db.prepare('UPDATE cases SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/rules/:id/toggle', (req, res) => {
  const rule = req.db.prepare('SELECT active FROM rules WHERE id=?').get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Not found' });
  req.db.prepare('UPDATE rules SET active=? WHERE id=?').run(rule.active ? 0 : 1, req.params.id);
  res.json({ ok: true, active: !rule.active });
});

app.delete('/api/rules/:id', (req, res) => {
  req.db.prepare('DELETE FROM rules WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/rules', (req, res) => {
  const { name, type, category, priority } = req.body;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const r = req.db.prepare(
    'INSERT INTO rules (name,type,category,priority,active,trigger_count,last_modified) VALUES (?,?,?,?,1,0,?)'
  ).run(name, type, category || 'Transaction', priority || 5, now);
  res.json({ ok: true, id: r.lastInsertRowid });
});

// Demo controls
app.post('/api/demo/reset', (req, res) => {
  resetSessionDb(req.sid);
  const next = newSid();
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${next}; ${cookieFlags()}`);
  res.json({ ok: true, sid: next });
});

app.get('/api/demo/info', (req, res) => {
  res.json({
    sid: req.sid,
    ttl_hours: Math.round(SESSION_TTL_MS / 3600000),
  });
});

// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🛡  Sentinel Cyber  →  http://localhost:${PORT}`);
  console.log(`  📦  per-session sandbox at db/sessions/, TTL ${Math.round(SESSION_TTL_MS / 3600000)}h\n`);
});
