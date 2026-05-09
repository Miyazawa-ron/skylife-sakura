import { verifyPassword, createToken, json, err } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { email, password } = body;
  if (!email || !password) return err('email and password required');

  const emailLower = email.trim().toLowerCase();
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(emailLower)
    .first();

  if (!user) return err('no account found for this email. switch to register.', 401);

  const valid = await verifyPassword(password, user.pw_hash, user.pw_salt);
  if (!valid) return err('password does not match.', 401);

  const token = await createToken({ userId: user.id, email: emailLower }, env.JWT_SECRET);

  const adminEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const isAdmin = adminEmail !== '' && emailLower === adminEmail;
  return json({ token, email: emailLower, name: user.name, credits: user.credits, isAdmin });
}
