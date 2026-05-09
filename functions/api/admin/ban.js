import { requireAdmin, json, err } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return err('forbidden', 403);

  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { email, active } = body;
  if (!email) return err('email required');
  if (active !== 0 && active !== 1) return err('active must be 0 or 1');

  const updated = await env.DB
    .prepare('UPDATE users SET is_active = ? WHERE email = ? RETURNING id, email, name, credits, is_active')
    .bind(active, email.trim().toLowerCase()).first();

  if (!updated) return err('user not found');
  return json({ email: updated.email, name: updated.name, credits: updated.credits, is_active: updated.is_active });
}
