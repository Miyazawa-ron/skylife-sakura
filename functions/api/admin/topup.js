import { requireAdmin, json, err } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return err('forbidden', 403);

  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { email, amount, zero } = body;
  if (!email) return err('email required');
  const emailLower = email.trim().toLowerCase();

  if (zero) {
    const updated = await env.DB
      .prepare('UPDATE users SET credits = 0 WHERE email = ? RETURNING id, email, name, credits')
      .bind(emailLower).first();
    if (!updated) return err('user not found');
    return json({ email: updated.email, name: updated.name, credits: updated.credits });
  }

  const n = parseInt(amount, 10);
  if (!n || n <= 0 || n > 10000) return err('amount must be 1–10000');

  const updated = await env.DB
    .prepare('UPDATE users SET credits = credits + ? WHERE email = ? RETURNING id, email, name, credits')
    .bind(n, emailLower).first();

  if (!updated) return err('user not found');
  return json({ email: updated.email, name: updated.name, credits: updated.credits });
}
