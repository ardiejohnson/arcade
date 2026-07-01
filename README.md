# Arcade

Browser games with a shared leaderboard. Deployed to **arcade.ardiejohnson.com**.

## Games

- **Hoarder Patrol** — defend the house from incoming junk. `/hoarder-patrol`
- **Dow Jones Pinball** — 8-bit Wall Street pinball patterned after *3D Pinball: Space Cadet*.
  Select DEALS at the B-U-Y targets, run them at THE EXCHANGE, and climb from Intern to Mogul. `/dow-jones-pinball`

Add a new game by dropping `<game-slug>.html` into the repo root, adding the
slug to the `GAMES` set in `api/scores.js`, and linking it from `index.html`.

## Stack

- Static HTML/JS — no build step.
- `api/scores.js` — Vercel serverless function. Backed by Upstash Redis sorted
  sets (one key per game: `leaderboard:<slug>`). Top 100 per game retained.
- Vercel auto-deploys on push to `main`.

## Local development

The games run fine by opening their HTML file directly — the leaderboard
calls fail silently and the game still plays.

For the leaderboard locally, install the Vercel CLI and run `npm run dev`.
You'll need `.env.local` with Upstash credentials (see below).

## Environment variables

Set in Vercel project settings (Production + Preview + Development):

| Var | Source |
|-----|--------|
| `UPSTASH_REDIS_REST_URL`   | Upstash Console → your DB → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | same panel |

For local `vercel dev`, also drop them in `.env.local` at the repo root.

## API

`GET /api/scores?game=<slug>&limit=<n>` → `{ scores: [{name, score, wave, killed, ts}, ...] }`

`POST /api/scores` body `{ game, name, score, wave, killed }` → `{ ok: true }`.

Names are clamped to 16 chars and stripped of anything outside `[A-Za-z0-9 -_]`.
Scores outside `(0, 1e9]` are rejected.
