'use strict';

const path = require('path');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/pdb_history.db');

let _db = null;

function getDB() {
  if (_db) return _db;
  try {
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ts         TEXT NOT NULL,
        total      INTEGER,
        blocked    INTEGER,
        active_bl  INTEGER,
        inactive_bl INTEGER,
        low_ha     INTEGER,
        safe       INTEGER,
        full_out   INTEGER
      );
      CREATE TABLE IF NOT EXISTS pdb_history (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        snap_id    INTEGER,
        namespace  TEXT,
        name       TEXT,
        status     TEXT,
        disruptions INTEGER,
        running_pods INTEGER,
        ts         TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(ts);
      CREATE INDEX IF NOT EXISTS idx_pdb_history_ts ON pdb_history(ts);
    `);
    return _db;
  } catch (e) {
    console.warn('SQLite unavailable (install better-sqlite3 for history):', e.message);
    return null;
  }
}

function saveSnapshot(summary, pdbs) {
  const db = getDB();
  if (!db) return;

  const ins = db.prepare(`
    INSERT INTO snapshots (ts,total,blocked,active_bl,inactive_bl,low_ha,safe,full_out)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const insPDB = db.prepare(`
    INSERT INTO pdb_history (snap_id,namespace,name,status,disruptions,running_pods,ts)
    VALUES (?,?,?,?,?,?,?)
  `);

  const run = db.transaction(() => {
    const result = ins.run(
      summary.timestamp, summary.total, summary.blocked,
      summary.activeBlockers, summary.inactiveBlockers,
      summary.lowHa, summary.safe, summary.fullOutage
    );
    const snapId = result.lastInsertRowid;
    for (const p of pdbs) {
      insPDB.run(snapId, p.namespace, p.name, p.status,
        p.disruptionsAllowed, p.runningPods, summary.timestamp);
    }
  });
  run();
}

function getHistory(limit = 100) {
  const db = getDB();
  if (!db) return [];
  return db.prepare(`SELECT * FROM snapshots ORDER BY ts DESC LIMIT ?`).all(limit);
}

function getPDBTrend(namespace, name, limit = 50) {
  const db = getDB();
  if (!db) return [];
  return db.prepare(`
    SELECT ts, status, disruptions, running_pods
    FROM pdb_history
    WHERE namespace = ? AND name = ?
    ORDER BY ts DESC LIMIT ?
  `).all(namespace, name, limit);
}

module.exports = { saveSnapshot, getHistory, getPDBTrend };
