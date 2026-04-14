/**
 * Seed SQLite database with realistic anti-fraud demo data
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sentinel.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

// ── Helpers ───────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function pad(n) { return String(n).padStart(2, '0'); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALERT_TYPES   = ['Velocity Check', 'IP Geofencing', 'Suspicious Pattern', 'ML Model Flag', 'Rapid Account Switching', 'Large Withdrawal'];
const SEVERITIES    = ['Critical','High','Medium','Low'];
const SEV_WEIGHTS   = [0.1, 0.25, 0.40, 0.25]; // distribution
const METHODS       = ['Velocity', 'IP Geofencing', 'ML Model', 'Pattern Match', 'Manual Review'];
const ANALYSTS      = ['Sarah K.', 'Mike T.', 'Elena K.', 'Alex P.', 'Chris B.'];
const CASE_STATUSES = ['Open','Under Review','Escalated','Closed'];
const ALERT_STATUSES = ['New','New','New','Acknowledged','Resolved']; // weighted

function weightedSeverity() {
  const r = Math.random();
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

// ── Clear existing data ───────────────────────────────────────
db.exec('DELETE FROM alerts; DELETE FROM cases; DELETE FROM rules; DELETE FROM timeline;');

// ── Alerts (120 rows) ─────────────────────────────────────────
const insertAlert = db.prepare(`
  INSERT INTO alerts (alert_code, timestamp, account_uuid, account_name, alert_type, severity, details, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const alertDetails = {
  'Velocity Check':           'Deposit frequency exceeded threshold by {n}% in 15-minute window',
  'IP Geofencing':            'Login from high-risk country ({country}), account registered in CY',
  'Suspicious Pattern':       'Matched pattern: rapid fund movement across {n} linked accounts',
  'ML Model Flag':            'Ensemble model confidence {n}% — anomaly in trading behaviour',
  'Rapid Account Switching':  '{n} account switches in 8 minutes from same device fingerprint',
  'Large Withdrawal':         'Single withdrawal ${n}K exceeds 3× rolling 30-day average',
};
const countries = ['RU','CN','NG','PK','BY','IR','KP','VN'];

const insertAlerts = db.transaction(() => {
  for (let i = 1; i <= 120; i++) {
    const type = pick(ALERT_TYPES);
    const tmpl = alertDetails[type];
    const detail = tmpl
      .replace('{n}', randInt(20, 180))
      .replace('{country}', pick(countries))
      .replace('${n}', randInt(10, 500));
    insertAlert.run(
      `#AL-${String(9000 + i).padStart(4, '0')}`,
      isoDate(Math.floor(i / 10), randInt(0, 23), randInt(0, 59)),
      uuid(),
      `user_${uuid().substring(0, 8)}@example.com`,
      type,
      weightedSeverity(),
      detail,
      pick(ALERT_STATUSES)
    );
  }
});
insertAlerts();

// ── Cases (60 rows) ───────────────────────────────────────────
const insertCase = db.prepare(`
  INSERT INTO cases (case_code, created_at, account_uuid, account_email, risk_level, detection_method, assigned_to, last_updated, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertCases = db.transaction(() => {
  for (let i = 1; i <= 60; i++) {
    const createdDays = Math.floor(i / 3);
    insertCase.run(
      `#CS-${String(8800 + i).padStart(4, '0')}`,
      isoDate(createdDays, randInt(0, 12), randInt(0, 59)),
      uuid(),
      `client_${uuid().substring(0, 8)}@broker.io`,
      weightedSeverity(),
      pick(METHODS),
      pick(ANALYSTS),
      isoDate(Math.floor(createdDays / 2), randInt(0, 6), randInt(0, 59)),
      pick(CASE_STATUSES)
    );
  }
});
insertCases();

// ── Rules (8 rows) ────────────────────────────────────────────
const insertRule = db.prepare(`
  INSERT INTO rules (name, type, category, priority, active, trigger_count, last_modified)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const RULES_DATA = [
  ['Velocity Check — Deposits',           'Velocity',   'Transaction', 8, 1, 342, isoDate(2)],
  ['Large Withdrawal Pattern',            'Pattern',    'Transaction', 9, 1,  89, isoDate(5)],
  ['Unusual Trading Hours',               'Threshold',  'Transaction', 4, 0,   0, isoDate(14)],
  ['High-Frequency Trade Limit',          'ML Model',   'Transaction', 7, 1, 211, isoDate(1)],
  ['Multiple Failed Logins',              'Threshold',  'Account',    10, 1, 452, isoDate(3)],
  ['Rapid Account Switching',             'Pattern',    'Account',     6, 1,  67, isoDate(7)],
  ['IP Geofencing — High Risk Countries', 'Velocity',   'Network',     8, 1, 123, isoDate(4)],
  ['Tor Exit Node Usage',                 'Pattern',    'Network',     5, 0,   0, isoDate(21)],
];

const insertRules = db.transaction(() => {
  for (const r of RULES_DATA) insertRule.run(...r);
});
insertRules();

// ── Timeline (24 hours) ───────────────────────────────────────
const insertTimeline = db.prepare(`
  INSERT INTO timeline (hour, count, is_spike, spike_label) VALUES (?, ?, ?, ?)
`);

const TIMELINE = [
  [0,12,0,null],[1,8,0,null],[2,6,0,null],[3,5,0,null],[4,7,0,null],[5,11,0,null],
  [6,18,0,null],[7,25,0,null],[8,42,0,null],[9,68,0,null],[10,95,0,null],[11,130,0,null],
  [12,155,0,null],[13,180,1,'SPIKE: Velocity Attack'],[14,210,0,null],[15,190,0,null],
  [16,240,1,'CRITICAL: IP Tunneling'],[17,220,0,null],[18,195,0,null],[19,170,0,null],
  [20,145,0,null],[21,118,0,null],[22,88,0,null],[23,62,0,null],
];

const insertTimelines = db.transaction(() => {
  for (const [h, c, s, l] of TIMELINE) insertTimeline.run(h, c, s, l);
});
insertTimelines();

// ── Summary ───────────────────────────────────────────────────
console.log('✅ Database seeded:');
console.log(`   alerts:   ${db.prepare('SELECT COUNT(*) as n FROM alerts').get().n}`);
console.log(`   cases:    ${db.prepare('SELECT COUNT(*) as n FROM cases').get().n}`);
console.log(`   rules:    ${db.prepare('SELECT COUNT(*) as n FROM rules').get().n}`);
console.log(`   timeline: ${db.prepare('SELECT COUNT(*) as n FROM timeline').get().n} hours`);
console.log(`   DB file:  ${DB_PATH}`);

db.close();
