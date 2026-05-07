import { requireAuth, json, err } from '../_auth.js';

export async function onRequestGet({ request, env }) {
  const user = await requireAuth(request, env);
  if (!user) return err('unauthorized', 401);
  return json({ email: user.email, name: user.name, credits: user.credits });
}
