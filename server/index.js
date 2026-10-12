import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";
import { extract, summarize } from "./extract.js";
import { readNext } from "./queue.js";

const app = express();
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");
const TOKEN = process.env.API_TOKEN;
const COLS = "a.id, a.url, a.title, a.summary, a.site, a.tags, a.word_count, a.read, a.priority, a.saved_at, a.read_at";

app.use(express.json());
app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use("/api", (req, res, next) => {
  if (!TOKEN || req.get("Authorization") === `Bearer ${TOKEN}`) return next();
  res.status(401).json({ error: "Missing or wrong API token" });
});
app.use(express.static(PUBLIC));

const getOne = (id) => db.prepare(`SELECT ${COLS} FROM articles a WHERE id = ?`).get(id);

// "react hooks" -> FTS5 prefix query: "react"* "hooks"*
const ftsQuery = (q) =>
  q.split(/\s+/).filter(Boolean).map((t) => `"${t.replace(/"/g, "")}"*`).join(" ");

app.post("/api/articles", async (req, res) => {
  let url;
  try {
    url = new URL(req.body.url);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: "Enter a full URL starting with http:// or https://" });
  }
  url.hash = "";

  const dupe = db.prepare("SELECT id FROM articles WHERE url = ?").get(url.href);
  if (dupe) return res.json({ ...getOne(dupe.id), duplicate: true });

  let page;
  try {
    page = await extract(url.href);
  } catch {
    page = { title: req.body.title || url.href, description: "", content: "", site: url.hostname, wordCount: 0 };
  }
  const { summary, tags } = await summarize(page.content, page.description);
  const allTags = [...new Set([...(req.body.tags || []), ...tags])].join(",");

  const info = db.prepare(
    `INSERT INTO articles (url, title, summary, content, site, tags, word_count, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(url.href, page.title, summary, page.content, page.site, allTags, page.wordCount, Date.now());
  res.status(201).json(getOne(info.lastInsertRowid));
});

app.get("/api/articles", (req, res) => {
  const { q = "", filter = "all", tag = "" } = req.query;
  const search = q.trim();
  const where = [];
  const params = [];
  if (search) { where.push("articles_fts MATCH ?"); params.push(ftsQuery(search)); }
  if (filter === "unread") where.push("a.read = 0");
  if (filter === "read") where.push("a.read = 1");
  if (tag) { where.push("(',' || a.tags || ',') LIKE ?"); params.push(`%,${tag},%`); }

  const from = search ? "articles_fts JOIN articles a ON a.id = articles_fts.rowid" : "articles a";
  const order = search ? "rank" : "a.saved_at DESC";
  const sql = `SELECT ${COLS} FROM ${from} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT 200`;
  try {
    res.json(db.prepare(sql).all(...params));
  } catch {
    res.json([]); // malformed search syntax
  }
});

app.get("/api/queue", (req, res) => {
  const rows = db.prepare(`SELECT ${COLS} FROM articles a WHERE a.read = 0`).all();
  res.json(readNext(rows, Number(req.query.limit) || 10));
});

app.patch("/api/articles/:id", (req, res) => {
  const { read, priority, tags } = req.body;
  const cur = getOne(req.params.id);
  if (!cur) return res.status(404).json({ error: "Article not found" });
  const nextRead = read === undefined ? cur.read : read ? 1 : 0;
  db.prepare("UPDATE articles SET read = ?, read_at = ?, priority = ?, tags = ? WHERE id = ?").run(
    nextRead,
    nextRead ? cur.read_at || Date.now() : null,
    priority ?? cur.priority,
    Array.isArray(tags) ? tags.join(",") : cur.tags,
    cur.id
  );
  res.json(getOne(cur.id));
});

app.delete("/api/articles/:id", (req, res) => {
  const info = db.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
  res.sendStatus(info.changes ? 204 : 404);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ReadLater running on http://localhost:${port}`));
