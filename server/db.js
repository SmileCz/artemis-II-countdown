import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const defaultPath = path.resolve(process.cwd(), "data", "artemis-changes.db");
const dbPath = process.env.SQLITE_PATH || defaultPath;
const dbDir = path.dirname(dbPath);

fs.mkdirSync(dbDir, {recursive: true});

if (!fs.existsSync(dbPath)) {
  fs.closeSync(fs.openSync(dbPath, "w"));
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS launch_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_key TEXT NOT NULL,
    mission_label TEXT NOT NULL,
    from_net TEXT,
    to_net TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (mission_key, from_net, to_net)
  );
`);

const insertChangeStmt = db.prepare(`
  INSERT OR IGNORE INTO launch_changes (
    mission_key,
    mission_label,
    from_net,
    to_net,
    detected_at
  ) VALUES (
    @missionKey,
    @missionLabel,
    @fromNet,
    @toNet,
    @detectedAt
  )
`);

const listChangesStmt = db.prepare(`
  SELECT
    id,
    mission_key AS missionKey,
    mission_label AS missionLabel,
    from_net AS fromNet,
    to_net AS toNet,
    detected_at AS detectedAt,
    created_at AS createdAt
  FROM launch_changes
  ORDER BY datetime(created_at) DESC, id DESC
  LIMIT ?
`);

export function insertLaunchChange(change) {
  return insertChangeStmt.run(change);
}

export function listLaunchChanges(limit = 100) {
  return listChangesStmt.all(limit);
}

export function getDbPath() {
  return dbPath;
}
