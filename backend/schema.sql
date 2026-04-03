-- CampusConnect Database Schema (SQLite)

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'student',
  department  TEXT DEFAULT NULL,
  year        TEXT DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Announcements ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  pdf_data    BLOB DEFAULT NULL,
  pdf_name    TEXT DEFAULT NULL,
  pdf_mime    TEXT DEFAULT NULL,
  department  TEXT NOT NULL DEFAULT 'All',
  year        TEXT NOT NULL DEFAULT 'All',
  category    TEXT NOT NULL DEFAULT 'Academic',
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_department ON announcements (department);
CREATE INDEX IF NOT EXISTS idx_year ON announcements (year);
CREATE INDEX IF NOT EXISTS idx_category ON announcements (category);
CREATE INDEX IF NOT EXISTS idx_created_at ON announcements (created_at);

-- ─── Comments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id              TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  text            TEXT NOT NULL,
  author_id       TEXT NOT NULL,
  author_name     TEXT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id)       REFERENCES users(id)         ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcement_id ON comments (announcement_id);
