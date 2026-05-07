import { requireAuth, json, err } from '../_auth.js';

export async function onRequestGet({ request, env }) {
  const user = await requireAuth(request, env);
  if (!user) return err('unauthorized', 401);

  const rows = await env.DB
    .prepare(`SELECT id, prompt, model, aspect, image_url, video_url, caption, credits_used, created_at
              FROM generations WHERE user_id = ?
              ORDER BY created_at DESC LIMIT 6`)
    .bind(user.id)
    .all();

  return json({ generations: rows.results || [] });
}
