import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH || "reading.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT, summary TEXT, content TEXT, site TEXT,
  tags TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  saved_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, summary, content, tags, content='articles', content_rowid='id'
);
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, content, tags)
  VALUES (new.id, new.title, new.summary, new.content, new.tags);
END;
CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content, tags)
  VALUES ('delete', old.id, old.title, old.summary, old.content, old.tags);
END;
CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content, tags)
  VALUES ('delete', old.id, old.title, old.summary, old.content, old.tags);
  INSERT INTO articles_fts(rowid, title, summary, content, tags)
  VALUES (new.id, new.title, new.summary, new.content, new.tags);
END;
`);

export default db;
