import { hashPassword, createToken, json, err } from '../../_auth.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { email, password, name } = body;
  if (!email || !password) return err('email and password required');
  if (password.length < 6) return err('password must be at least 6 characters');

  const emailLower = email.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(emailLower)) return err('invalid email address');

  // Check for existing account
  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(emailLower)
    .first();
  if (existing) return err('an account already exists for this email. try login.');

  const { hash, salt } = await hashPassword(password);
  const displayName = (name || '').trim() || emailLower.split('@')[0];

  const result = await env.DB
    .prepare('INSERT INTO users (email, name, pw_hash, pw_salt, credits) VALUES (?, ?, ?, ?, 100) RETURNING id, credits')
    .bind(emailLower, displayName, hash, salt)
    .first();

  const token = await createToken({ userId: result.id, email: emailLower }, env.JWT_SECRET);

  return json({ token, email: emailLower, name: displayName, credits: result.credits }, 201);
}
