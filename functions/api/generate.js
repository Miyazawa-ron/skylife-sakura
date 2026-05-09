import { requireAuth, json, err } from '../_auth.js';

const COST = { 'gpt-image': 1, 'seedance-video': 8 };

export async function onRequestPost({ request, env }) {
  const user = await requireAuth(request, env);
  if (!user) return err('unauthorized', 401);

  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { prompt, model, aspect } = body;
  if (!prompt?.trim()) return err('prompt is required');
  if (!COST[model]) return err('invalid model');

  const cost = COST[model];
  const updated = await env.DB
    .prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ? RETURNING credits')
    .bind(cost, user.id, cost).first();
  if (!updated) return err('insufficient credits', 402);

  try {
    if (model === 'gpt-image') {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt: prompt.trim(), n: 1, size: '1024x1024', response_format: 'url' }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || 'openai error ' + res.status);
      }
      const data = await res.json();
      const imageUrl = data?.data?.[0]?.url;
      if (!imageUrl) throw new Error('no image url');
      await env.DB.prepare('INSERT INTO generations (user_id, prompt, model, aspect, image_url, credits_used) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(user.id, prompt.trim(), model, aspect || '1:1', imageUrl, cost).run();
      return json({ imageUrl, caption: prompt.slice(0, 60), credits: updated.credits });

    } else {
      // Seedance: create task and return task ID for frontend polling
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.SEEDANCE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'doubao-seedance-2-0-260128', content: [{ type: 'text', text: prompt.trim() }] }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error('seedance ' + res.status + ': ' + JSON.stringify(e));
      }
      const data = await res.json();
      const taskId = data?.id;
      if (!taskId) throw new Error('no task id');
      await env.DB.prepare('INSERT INTO generations (user_id, prompt, model, aspect, credits_used) VALUES (?, ?, ?, ?, ?)')
        .bind(user.id, prompt.trim(), model, aspect || '1:1', cost).run();
      return json({ taskId, credits: updated.credits, polling: true });
    }
  } catch (e) {
    await env.DB.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').bind(cost, user.id).run();
    return err('generation failed: ' + e.message, 502);
  }
}
