/**
 * Per-session SQLite sandbox factory.
 *
 * Each visitor gets their own SQLite file (`db/sessions/<sid>.db`) seeded
 * deterministically from their session id. They can acknowledge alerts,
 * toggle rules, delete cases — none of it leaks to other visitors.
 *
 * - First touch → schema applied + seedDatabase(db, sid) → unique dataset.
 * - Subsequent requests → cached open Database handle.
 * - Idle sessions older than SESSION_TTL_MS are evicted on a timer and
 *   their .db files deleted from disk.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { seedDatabase } = require('./seed');

const SCHEMA = path.join(__dirname, 'schema.sql');
const SESSIONS_DIR = process.env.SENTINEL_SESSIONS_DIR
  || path.join(__dirname, 'sessions');

const SESSION_TTL_MS  = parseInt(process.env.SENTINEL_SESSION_TTL_MS  || '86400000', 10); // 24h
const SESSION_SWEEP_MS = parseInt(process.env.SENTINEL_SESSION_SWEEP_MS || '3600000', 10); // 1h
const MAX_OPEN_HANDLES = parseInt(process.env.SENTINEL_MAX_HANDLES || '500', 10);

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const SCHEMA_SQL = fs.readFileSync(SCHEMA, 'utf8');

/** sid → { db, lastUsed } */
const cache = new Map();

function dbPathFor(sid) {
  return path.join(SESSIONS_DIR, `${sid}.db`);
}

function openSession(sid) {
  const dbPath = dbPathFor(sid);
  const isFresh = !fs.existsSync(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  if (isFresh) {
    db.exec(SCHEMA_SQL);
    seedDatabase(db, sid);
  }
  return db;
}

function getSessionDb(sid) {
  if (!sid || typeof sid !== 'string') throw new Error('sid required');
  const entry = cache.get(sid);
  if (entry) {
    entry.lastUsed = Date.now();
    return entry.db;
  }
  if (cache.size >= MAX_OPEN_HANDLES) evictOldest();
  const db = openSession(sid);
  cache.set(sid, { db, lastUsed: Date.now() });
  return db;
}

function resetSessionDb(sid) {
  const entry = cache.get(sid);
  if (entry) {
    try { entry.db.close(); } catch (_) {}
    cache.delete(sid);
  }
  const dbPath = dbPathFor(sid);
  for (const suffix of ['', '-shm', '-wal']) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }
}

function evictOldest() {
  let oldestSid = null;
  let oldestTs = Infinity;
  for (const [sid, entry] of cache.entries()) {
    if (entry.lastUsed < oldestTs) {
      oldestTs = entry.lastUsed;
      oldestSid = sid;
    }
  }
  if (oldestSid) {
    const entry = cache.get(oldestSid);
    try { entry.db.close(); } catch (_) {}
    cache.delete(oldestSid);
  }
}

function sweep() {
  const now = Date.now();
  // Close idle handles
  for (const [sid, entry] of cache.entries()) {
    if (now - entry.lastUsed > SESSION_TTL_MS) {
      try { entry.db.close(); } catch (_) {}
      cache.delete(sid);
    }
  }
  // Delete on-disk files older than TTL
  let files = [];
  try { files = fs.readdirSync(SESSIONS_DIR); } catch (_) { return; }
  for (const f of files) {
    if (!f.endsWith('.db') && !f.endsWith('.db-shm') && !f.endsWith('.db-wal')) continue;
    const full = path.join(SESSIONS_DIR, f);
    let stat;
    try { stat = fs.statSync(full); } catch (_) { continue; }
    if (now - stat.mtimeMs > SESSION_TTL_MS) {
      try { fs.unlinkSync(full); } catch (_) {}
    }
  }
}

const sweepTimer = setInterval(sweep, SESSION_SWEEP_MS);
sweepTimer.unref?.();

module.exports = {
  getSessionDb,
  resetSessionDb,
  sweep,
  SESSION_TTL_MS,
};
