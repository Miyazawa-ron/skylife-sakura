import { json, err } from '../../_auth.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(
      'SELECT id, name, message, created_at FROM messages WHERE is_active = 1 ORDER BY created_at DESC LIMIT 50'
    )
    .all();
  return json({ messages: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const name    = (body.name    || '').trim();
  const message = (body.message || '').trim();

  if (!name)              return err('name is required');
  if (!message)           return err('message is required');
  if (name.length > 50)   return err('name must be 50 characters or fewer');
  if (message.length > 200) return err('message must be 200 characters or fewer');

  // IP hash for abuse prevention (no raw IP stored)
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    : null;

  // Rate limit: max 3 posts per IP per 60 seconds
  if (ipHash) {
    const { results: recent } = await env.DB
      .prepare(
        "SELECT COUNT(*) AS cnt FROM messages WHERE ip_hash = ? AND created_at > datetime('now', '+9 hours', '-60 seconds')"
      )
      .bind(ipHash)
      .all();
    if (recent[0]?.cnt >= 3) return err('too many messages. please wait a moment.', 429);
  }

  const row = await env.DB
    .prepare(
      'INSERT INTO messages (name, message, ip_hash) VALUES (?, ?, ?) RETURNING id, name, message, created_at'
    )
    .bind(name, message, ipHash)
    .first();

  return json(row, 201);
}
