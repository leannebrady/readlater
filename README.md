# ReadLater

A reading list manager: save articles from a browser extension, get automatic
summaries and tags, search everything with full-text search, and let a scoring
queue tell you what to read next.

**Stack:** Node.js, Express, SQLite (FTS5 full-text search), Cheerio, vanilla JS web app,
Chrome/Edge Manifest V3 extension. 

## Features
- One-click save from the extension popup, a keyboard shortcut (Alt+Shift+S), or a right-click on any link
- Server-side page extraction (title, description, article text, word count)
- Optional LLM summaries and topic tags; falls back to the page description
- Full-text search across titles, summaries, tags and article body (SQLite FTS5, prefix matching)
- "Read next" queue ranked by priority, freshness, a resurfacing nudge for old saves, and a short-read bonus
- Mark finished, prioritize, tag filtering, delete
- Optional bearer-token auth for deployed instances

## Run locally
```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY and API_TOKEN
node --env-file=.env server/index.js
# open http://localhost:3000
```
Run tests with `npm test`.

## Install the extension
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and choose the `extension/` folder.
3. Open the popup, expand **Server settings**, and set your server URL (and token if you set one).

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/articles` | Save `{ url, title?, tags? }` |
| GET | `/api/articles?q=&filter=all\|unread\|read&tag=` | List or search |
| GET | `/api/queue?limit=10` | Ranked read-next list |
| PATCH | `/api/articles/:id` | Update `{ read?, priority?, tags? }` |
| DELETE | `/api/articles/:id` | Remove |

## Design notes
- **SQLite + FTS5** keeps deployment to a single file and gives ranked search without running a search service.
- **Triggers keep the FTS index in sync**, so the API code never touches the index directly.
- **Queue scoring lives in `server/queue.js`** as a pure function, which makes it easy to unit test and tune.

## Deploying
Any Node host with a persistent disk works (Fly.io, Railway, a small VPS). Set `API_TOKEN`,
`DB_PATH` (on the persistent volume) and optionally `ANTHROPIC_API_KEY`, and put it behind HTTPS.

## Known limitations / next steps
- The server fetches user-supplied URLs; before exposing it publicly, add SSRF protection (block private IP ranges).
- Pages that render with client-side JavaScript extract poorly; sending the rendered text from the extension would fix that.
- Single-user by design. Multi-user would need accounts and a per-user `user_id` column.
