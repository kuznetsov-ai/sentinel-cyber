PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_code   TEXT    NOT NULL,          -- #AL-XXXX
  timestamp    TEXT    NOT NULL,
  account_uuid TEXT    NOT NULL,
  account_name TEXT    NOT NULL,
  alert_type   TEXT    NOT NULL,          -- Velocity Check, IP Geofencing, etc.
  severity     TEXT    NOT NULL CHECK(severity IN ('Critical','High','Medium','Low')),
  details      TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'New' CHECK(status IN ('New','Acknowledged','Resolved'))
);

CREATE TABLE IF NOT EXISTS cases (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  case_code        TEXT NOT NULL,         -- #CS-XXXX
  created_at       TEXT NOT NULL,
  account_uuid     TEXT NOT NULL,
  account_email    TEXT NOT NULL,
  risk_level       TEXT NOT NULL CHECK(risk_level IN ('Critical','High','Medium','Low')),
  detection_method TEXT NOT NULL,
  assigned_to      TEXT NOT NULL,
  last_updated     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Under Review','Escalated','Closed'))
);

CREATE TABLE IF NOT EXISTS rules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  type           TEXT    NOT NULL CHECK(type IN ('Velocity','ML Model','Pattern','Threshold')),
  category       TEXT    NOT NULL CHECK(category IN ('Transaction','Account','Network')),
  priority       INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 10),
  active         INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  trigger_count  INTEGER NOT NULL DEFAULT 0,
  last_modified  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  hour      INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
  count     INTEGER NOT NULL DEFAULT 0,
  is_spike  INTEGER NOT NULL DEFAULT 0,
  spike_label TEXT
);
