# MazeRunner leaderboard & registration

Live: **https://nhs-ne-astatistics.hheylau.workers.dev**

The service that shows the MazeRunner leaderboard and handles account registration.
Rebuilt from the old Express + MySQL deployment on Vercel and now runs on
**Cloudflare Workers** with a **D1** (SQLite) database.

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Redirects to `/pivot` |
| `/pivot` | GET | Per-player, per-level leaderboard |
| `/cross` | GET | Per-level records, averages and player counts |
| `/register` | GET | Registration form |
| `/registerData` | POST | Creates a player (`user`, `email`, `pass`; JSON or form data) |
| `/getData` | POST | Leaderboard data (`detail: 0` or `detail: 1`) |
| `/api/score` | POST | Score submission for the game (requires an API key) |
| `/healthz` | GET | Health check with player/score counts |

Static files are served from `public/`. The old `/js/...` paths are preserved
(`/js/register.js`, `/js/done.html`) so existing links keep working.

## Local development

```bash
npm install
npm run db:migrate:local
npm run dev
```

Wrangler prints a local URL (usually `http://localhost:8787`). Local D1 data is
stored in `.wrangler/state`.

To test score submission locally, create `.dev.vars`:

```text
SCORE_API_KEY=some-long-random-string
```

## Deployment

```bash
npm run db:migrate:remote   # apply migrations to the production D1 database
npm run deploy              # wrangler deploy
```

The Worker name is `nhs-ne-astatistics`, so it deploys to
`nhs-ne-astatistics.<your-subdomain>.workers.dev`. The D1 database is
`mazerunner-db` and is bound as `DB` in `wrangler.jsonc`.

## Submitting scores from the game

Set the secret once:

```bash
wrangler secret put SCORE_API_KEY
```

Then submit a finished run:

```bash
curl -X POST https://nhs-ne-astatistics.hheylau.workers.dev/api/score \
  -H "content-type: application/json" \
  -H "x-api-key: $SCORE_API_KEY" \
  -d '{"playerID":1,"levelID":6,"score":120,"time":84.5}'
```

The endpoint validates the player, creates the level label on first use, and
inserts the run. The old Unity build pointed at a now-dead PHP endpoint
(`unity.just4fun.tk`) that executed arbitrary SQL; that is intentionally not
supported here. Update `CsharpREST.cs` in the game to call `/api/score`.

## Database

- `migrations/0001_init.sql` — `Player`, `Level`, `Progress`
- `migrations/0002_seed_levels.sql` — original level labels

Useful commands:

```bash
npx wrangler d1 execute mazerunner-db --remote --command "SELECT * FROM Player LIMIT 20"
npx wrangler d1 execute mazerunner-db --remote --file=restore.sql
```

### Legacy data

The old MySQL server (`210.17.224.194:2086`, database `mazerunner`) no longer
accepts TCP connections, and the old Render deployment returns 404. Existing
players and scores could not be migrated automatically. If you still have a
MySQL dump, convert the `Player`, `Level` and `Progress` rows to SQLite `INSERT`
statements and load them with the `--file` command above.

## Security notes

- All SQL uses prepared statements with bound parameters.
- Registration is validated on both the client and the server.
- Score submission requires `SCORE_API_KEY` and is disabled until it is set.
- HTML responses send a restrictive Content-Security-Policy and other security
  headers.
- The password hash is kept byte-for-byte compatible with the shipped Unity
  client. It is a weak custom hash and should be replaced (together with a game
  update) when possible.
