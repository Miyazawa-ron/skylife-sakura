import { requireAdmin, json, err } from '../../_auth.js';

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return err('forbidden', 403);

  const rows = await env.DB
    .prepare('SELECT id, email, name, credits, is_active, created_at FROM users ORDER BY created_at DESC')
    .all();

  return json({ users: rows.results || [] });
}
