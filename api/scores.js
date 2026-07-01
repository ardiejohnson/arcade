import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const GAMES = new Set(['hoarder-patrol', 'dow-jones-pinball']);
const MAX_KEEP = 100;

const cleanName = (raw) =>
  String(raw || '')
    .replace(/[^A-Za-z0-9 \-_]/g, '')
    .trim()
    .slice(0, 16)
    .toUpperCase() || 'ANON';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(503).json({ error: 'leaderboard not configured' });
  }

  const game =
    req.method === 'GET'
      ? req.query.game
      : (req.body && req.body.game) || 'hoarder-patrol';
  if (!GAMES.has(game)) return res.status(400).json({ error: 'unknown game' });

  const key = `leaderboard:${game}`;

  try {
    if (req.method === 'GET') {
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
      const raw = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
      const scores = [];
      for (let i = 0; i < raw.length; i += 2) {
        const memberRaw = raw[i];
        const member = typeof memberRaw === 'string' ? safeParse(memberRaw) : memberRaw;
        if (!member) continue;
        scores.push({ ...member, score: Number(raw[i + 1]) });
      }
      return res.status(200).json({ scores });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? safeParse(req.body) || {} : req.body || {};
      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score) || 0);
      const wave = Math.max(1, Math.floor(Number(body.wave) || 1));
      const killed = Math.max(0, Math.floor(Number(body.killed) || 0));
      if (score <= 0 || score > 1e9) return res.status(400).json({ error: 'invalid score' });

      const member = JSON.stringify({ name, wave, killed, ts: Date.now() });
      await redis.zadd(key, { score, member });

      const total = await redis.zcard(key);
      if (total > MAX_KEEP) await redis.zremrangebyrank(key, 0, total - MAX_KEEP - 1);

      return res.status(200).json({ ok: true, name, score });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'server error', detail: String(err && err.message || err) });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
