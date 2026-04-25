/**
 * Seed a SQLite database with realistic anti-fraud demo data.
 *
 * Two modes:
 *   1. As a module — `require('./seed').seedDatabase(db, sid)` — used by the
 *      session sandbox factory in db.js. Deterministic per-sid via mulberry32.
 *   2. As a script — `node db/seed.js [sid]` — seeds db/sentinel.db locally
 *      (handy for poking around without spinning up the server).
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { makeRng } = require('./prng');

const SCHEMA = path.join(__dirname, 'schema.sql');

const ALERT_TYPES = [
  'Velocity Check', 'IP Geofencing', 'Suspicious Pattern', 'ML Model Flag',
  'Rapid Account Switching', 'Large Withdrawal', 'Wash Trading',
  'Layering', 'Bot Trading Signature', 'Stolen Card Deposit',
  'Mule Account Pattern', 'KYC Document Mismatch',
];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const SEV_WEIGHTS = [0.10, 0.25, 0.40, 0.25];
const METHODS = ['Velocity', 'IP Geofencing', 'ML Model', 'Pattern Match', 'Manual Review', 'Behavioural Biometrics', 'Network Graph'];
const ANALYSTS = [
  'Sarah K.', 'Mike T.', 'Elena K.', 'Alex P.', 'Chris B.',
  'Anya R.', 'Pavel D.', 'Maria O.', 'Tomáš H.', 'Iulia V.',
  'Demetris C.', 'Yusuf B.', 'Hannah W.',
];
const CASE_STATUSES = ['Open', 'Open', 'Under Review', 'Under Review', 'Escalated', 'Closed'];
const ALERT_STATUSES = ['New', 'New', 'New', 'Acknowledged', 'Resolved'];
const COUNTRIES = ['RU', 'CN', 'NG', 'PK', 'BY', 'IR', 'KP', 'VN', 'VE', 'MM', 'AF', 'SD'];
const EMAIL_DOMAINS = ['broker.io', 'fastex.cy', 'protonmail.com', 'mailinator.com', 'gmx.de', 'yandex.ru', 'proton.me', 'tuta.io', 'gmail.com'];
const FIRST_NAMES = ['john', 'kate', 'oleg', 'liu', 'andrei', 'maria', 'igor', 'fatima', 'pavel', 'ivan', 'sara', 'noah', 'wei', 'amir', 'lena', 'dimitri', 'sofia', 'pedro', 'yuki', 'nina'];
const ALERT_DETAILS = {
  'Velocity Check':           'Deposit frequency exceeded threshold by {n}% in 15-minute window',
  'IP Geofencing':            'Login from high-risk country ({country}), account registered in CY',
  'Suspicious Pattern':       'Matched pattern: rapid fund movement across {n} linked accounts',
  'ML Model Flag':            'Ensemble model confidence {n}% — anomaly in trading behaviour',
  'Rapid Account Switching':  '{n} account switches in 8 minutes from same device fingerprint',
  'Large Withdrawal':         'Single withdrawal ${n}K exceeds 3× rolling 30-day average',
  'Wash Trading':             '{n} self-matching trades within 4-min window — same beneficial owner',
  'Layering':                 'Order placed and cancelled {n}× without execution intent (spoofing)',
  'Bot Trading Signature':    'Inter-order latency std-dev {n}ms — non-human cadence',
  'Stolen Card Deposit':      'Card BIN flagged as compromised in {country} carding forum',
  'Mule Account Pattern':     'Funds in/out within {n}min, 0% trading activity, account age <30d',
  'KYC Document Mismatch':    'OCR vs declared name mismatch — confidence {n}%',
};

const RULES_BANK = [
  ['Velocity Check — Deposits',           'Velocity',  'Transaction'],
  ['Large Withdrawal Pattern',            'Pattern',   'Transaction'],
  ['Unusual Trading Hours',               'Threshold', 'Transaction'],
  ['High-Frequency Trade Limit',          'ML Model',  'Transaction'],
  ['Wash Trading Detector',               'Pattern',   'Transaction'],
  ['Layering / Spoofing Heuristic',       'Pattern',   'Transaction'],
  ['Multiple Failed Logins',              'Threshold', 'Account'],
  ['Rapid Account Switching',             'Pattern',   'Account'],
  ['Mule Account Heuristic',              'ML Model',  'Account'],
  ['KYC Document Mismatch',               'ML Model',  'Account'],
  ['IP Geofencing — High Risk Countries', 'Velocity',  'Network'],
  ['Tor Exit Node Usage',                 'Pattern',   'Network'],
  ['Datacenter / VPN Login',              'Pattern',   'Network'],
  ['Device Fingerprint Mass-Reuse',       'ML Model',  'Network'],
];

function seedDatabase(db, sid = 'default') {
  const rng = makeRng(sid);

  const pad = (n) => String(n).padStart(2, '0');
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (rng() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function weightedSeverity() {
    const r = rng();
    let cum = 0;
    for (let i = 0; i < SEVERITIES.length; i++) {
      cum += SEV_WEIGHTS[i];
      if (r < cum) return SEVERITIES[i];
    }
    return 'Low';
  }

  function isoDate(daysAgo, hoursAgo, minutesAgo) {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgo || 0));
    d.setHours(d.getHours() - (hoursAgo || 0));
    d.setMinutes(d.getMinutes() - (minutesAgo || 0));
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }

  function emailLike() {
    return `${pick(FIRST_NAMES)}_${uuid().substring(0, 5)}@${pick(EMAIL_DOMAINS)}`;
  }

  // ── Reset existing data (if any) ────────────────────────────────────────
  db.exec('DELETE FROM alerts; DELETE FROM cases; DELETE FROM rules; DELETE FROM timeline;');

  // ── Alerts: 100–160 rows, varying volume per session ────────────────────
  const alertCount = randInt(100, 160);
  const insertAlert = db.prepare(
    'INSERT INTO alerts (alert_code, timestamp, account_uuid, account_name, alert_type, severity, details, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const codeBase = 9000 + randInt(0, 700);
  db.transaction(() => {
    for (let i = 1; i <= alertCount; i++) {
      const type = pick(ALERT_TYPES);
      const tmpl = ALERT_DETAILS[type];
      const detail = tmpl
        .replace('{n}', randInt(20, 220))
        .replace('{country}', pick(COUNTRIES))
        .replace('${n}', randInt(8, 750));
      insertAlert.run(
        `#AL-${pad(codeBase + i)}`,
        isoDate(Math.floor(i / 10), randInt(0, 23), randInt(0, 59)),
        uuid(),
        emailLike(),
        type,
        weightedSeverity(),
        detail,
        pick(ALERT_STATUSES),
      );
    }
  })();

  // ── Cases: 40–80 rows ───────────────────────────────────────────────────
  const caseCount = randInt(40, 80);
  const insertCase = db.prepare(
    'INSERT INTO cases (case_code, created_at, account_uuid, account_email, risk_level, detection_method, assigned_to, last_updated, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const caseBase = 8800 + randInt(0, 400);
  db.transaction(() => {
    for (let i = 1; i <= caseCount; i++) {
      const createdDays = Math.floor(i / 3);
      insertCase.run(
        `#CS-${pad(caseBase + i)}`,
        isoDate(createdDays, randInt(0, 12), randInt(0, 59)),
        uuid(),
        emailLike(),
        weightedSeverity(),
        pick(METHODS),
        pick(ANALYSTS),
        isoDate(Math.floor(createdDays / 2), randInt(0, 6), randInt(0, 59)),
        pick(CASE_STATUSES),
      );
    }
  })();

  // ── Rules: 8–12 rows from the bank, with varied trigger counts ──────────
  const ruleCount = randInt(8, Math.min(12, RULES_BANK.length));
  const ruleSet = [...RULES_BANK].sort(() => rng() - 0.5).slice(0, ruleCount);
  const insertRule = db.prepare(
    'INSERT INTO rules (name, type, category, priority, active, trigger_count, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (const [name, type, category] of ruleSet) {
      insertRule.run(
        name, type, category,
        randInt(3, 10),                        // priority
        rng() < 0.8 ? 1 : 0,                   // 80% active
        rng() < 0.85 ? randInt(15, 520) : 0,   // 15% never fired
        isoDate(randInt(1, 25)),
      );
    }
  })();

  // ── Timeline: 24h, with 1–3 spikes at random hours ──────────────────────
  const baseShape = [12, 8, 6, 5, 7, 11, 18, 25, 42, 68, 95, 130, 155, 180, 210, 190, 240, 220, 195, 170, 145, 118, 88, 62];
  const spikeCount = randInt(1, 3);
  const spikeHours = new Set();
  while (spikeHours.size < spikeCount) spikeHours.add(randInt(8, 22));
  const SPIKE_LABELS = [
    'SPIKE: Velocity Attack', 'CRITICAL: IP Tunneling', 'ALERT: Mule Wave',
    'BURST: Layering Cluster', 'PEAK: Card Testing', 'SURGE: Stolen Cards',
  ];
  const insertTimeline = db.prepare(
    'INSERT INTO timeline (hour, count, is_spike, spike_label) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (let h = 0; h < 24; h++) {
      const jitter = randInt(-15, 15);
      const isSpike = spikeHours.has(h);
      const count = Math.max(0, baseShape[h] + jitter + (isSpike ? randInt(40, 90) : 0));
      insertTimeline.run(h, count, isSpike ? 1 : 0, isSpike ? pick(SPIKE_LABELS) : null);
    }
  })();

  return {
    alerts: alertCount,
    cases: caseCount,
    rules: ruleCount,
    spikes: spikeCount,
  };
}

module.exports = { seedDatabase };

// ── Script mode: seed db/sentinel.db locally ───────────────────────────────
if (require.main === module) {
  const sid = process.argv[2] || 'default';
  const dbPath = path.join(__dirname, 'sentinel.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  db.exec(fs.readFileSync(SCHEMA, 'utf8'));
  const stats = seedDatabase(db, sid);
  console.log('Seeded sentinel.db with sid=' + sid);
  console.log('  alerts:   ' + stats.alerts);
  console.log('  cases:    ' + stats.cases);
  console.log('  rules:    ' + stats.rules);
  console.log('  spikes:   ' + stats.spikes);
  db.close();
}
