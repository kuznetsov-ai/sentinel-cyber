/**
 * SQLite connection singleton
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sentinel.db');
const SCHEMA  = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-create schema if DB is new
db.exec(fs.readFileSync(SCHEMA, 'utf8'));

module.exports = db;
