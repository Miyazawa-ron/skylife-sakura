-- skyライフ · D1 database schema
-- Run with: wrangler d1 execute skylife --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email      TEXT    UNIQUE NOT NULL,
  name       TEXT,
  pw_hash    TEXT    NOT NULL,
  pw_salt    TEXT    NOT NULL,
  credits    INTEGER NOT NULL DEFAULT 100,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generations (
  id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT    NOT NULL,
  prompt       TEXT    NOT NULL,
  model        TEXT    NOT NULL,
  aspect       TEXT,
  image_url    TEXT,
  video_url    TEXT,
  caption      TEXT,
  credits_used INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id
  ON generations(user_id);

CREATE INDEX IF NOT EXISTS idx_generations_created_at
  ON generations(created_at DESC);
