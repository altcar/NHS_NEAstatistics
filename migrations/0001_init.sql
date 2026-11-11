-- MazeRunner schema for Cloudflare D1 (SQLite).
-- Mirrors the original MySQL tables: Player, Level, Progress.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Player (
  playerID  INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL COLLATE NOCASE UNIQUE,
  hash      TEXT NOT NULL,
  salt      INTEGER NOT NULL,
  username  TEXT NOT NULL COLLATE NOCASE UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Level (
  levelID   INTEGER PRIMARY KEY,
  levelName TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Progress (
  progressID INTEGER PRIMARY KEY AUTOINCREMENT,
  playerID   INTEGER NOT NULL REFERENCES Player(playerID) ON DELETE CASCADE,
  levelID    INTEGER NOT NULL REFERENCES Level(levelID),
  score      REAL NOT NULL DEFAULT 0,
  time       REAL NOT NULL DEFAULT 0,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_progress_level  ON Progress (levelID);
CREATE INDEX IF NOT EXISTS idx_progress_player ON Progress (playerID);
CREATE INDEX IF NOT EXISTS idx_progress_best   ON Progress (levelID, score DESC);
CREATE INDEX IF NOT EXISTS idx_progress_time   ON Progress (levelID, time ASC);
