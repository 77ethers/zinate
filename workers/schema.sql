-- Schema for zines table in Cloudflare D1 database
CREATE TABLE IF NOT EXISTS zines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT,
  zine_data TEXT NOT NULL, -- JSON string containing the zine items
  created_at TEXT NOT NULL
);

-- Index for faster retrieval
CREATE INDEX IF NOT EXISTS idx_zines_created_at ON zines (created_at);
