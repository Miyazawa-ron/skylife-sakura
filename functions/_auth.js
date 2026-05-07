// Shared JWT + password utilities for Pages Functions
// Imported by each API function via: import { ... } from '../../_auth.js'

const ALGO = { name: 'HMAC', hash: 'SHA-256' };
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toBase64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), ALGO, false, ['sign', 'verify']
  );
}

export async function createToken(payload, secret) {
  const header = toBase64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = toBase64url(new TextEncoder().encode(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  })));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${toBase64url(sig)}`;
}

export async function verifyToken(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      ALGO, key,
      Uint8Array.from(fromBase64url(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(fromBase64url(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// PBKDF2 — 100k iterations, SHA-256
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const toHex = (arr) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(salt) };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  const salt = Uint8Array.from(storedSalt.match(/.{2}/g), h => parseInt(h, 16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const newHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return newHash === storedHash;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function err(message, status = 400) {
  return json({ error: message }, status);
}

export async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload?.userId) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.userId).first();
  return user || null;
}
