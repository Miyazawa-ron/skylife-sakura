import { requireAuth, json, err } from '../_auth.js';

const COST = { 'gpt-image': 1, 'seedance-video': 4 };

const SIZE_MAP = {
  '1:1':  '1024x1024',
  '3:2':  '1536x1024',
  '2:3':  '1024x1536',
  '16:9': '1792x1024',
};

export async function onRequestPost({ request, env }) {
  const user = await requireAuth(request, env);
  if (!user) return err('unauthorized', 401);

  let body;
  try { body = await request.json(); } catch { return err('invalid json'); }

  const { prompt, model, aspect } = body;
  if (!prompt?.trim()) return err('prompt is required');
  if (!COST[model]) return err('invalid model — use gpt-image or seedance-video');

  const cost = COST[model];
  if (user.credits < cost) return err('insufficient credits', 402);

  // Deduct credits atomically — only proceed if the row was updated
  const updated = await env.DB
    .prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ? RETURNING credits')
    .bind(cost, user.id, cost)
    .first();

  if (!updated) return err('insufficient credits', 402);

  let imageUrl = null;
  let videoUrl = null;
  let caption = null;

  try {
    if (model === 'gpt-image') {
      ({ imageUrl, caption } = await generateImage(prompt, aspect, env));
    } else {
      ({ videoUrl, caption } = await generateVideo(prompt, env));
    }
  } catch (genErr) {
    // Refund credits on generation failure
    await env.DB
      .prepare('UPDATE users SET credits = credits + ? WHERE id = ?')
      .bind(cost, user.id)
      .run();
    return err(`generation failed: ${genErr.message}`, 502);
  }

  // Save to history
  const gen = await env.DB
    .prepare(`INSERT INTO generations (user_id, prompt, model, aspect, image_url, video_url, caption, credits_used)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(user.id, prompt.trim(), model, aspect || '1:1', imageUrl, videoUrl, caption, cost)
    .first();

  return json({
    id: gen.id,
    imageUrl,
    videoUrl,
    caption,
    credits: updated.credits,
  });
}

async function generateImage(prompt, aspect, env) {
  const size = SIZE_MAP[aspect] || '1024x1024';

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
      output_format: 'url',
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `openai error ${res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error('no image url in openai response');

  const caption = await generateCaption(prompt, 'still image', env);
  return { imageUrl, caption };
}

async function generateVideo(prompt, env) {
  // ByteDance Seedance Video API — VolcEngine / ARK endpoint
  // Configure SEEDANCE_API_KEY and SEEDANCE_ENDPOINT as Pages secrets
  const endpoint = env.SEEDANCE_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SEEDANCE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'seedance-1-lite',
      content: [{ type: 'text', text: prompt }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `seedance error ${res.status}`);
  }

  const data = await res.json();
  // Seedance returns a task ID; poll for completion
  const taskId = data?.id;
  if (!taskId) throw new Error('no task id in seedance response');

  const videoUrl = await pollSeedanceTask(taskId, endpoint, env);
  const caption = await generateCaption(prompt, '5-second video', env);
  return { videoUrl, caption };
}

async function pollSeedanceTask(taskId, baseEndpoint, env, maxAttempts = 30) {
  const pollUrl = baseEndpoint.replace('/tasks', `/tasks/${taskId}`);
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${env.SEEDANCE_API_KEY}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === 'succeeded') {
      return data.content?.[0]?.video_url || data.output?.video_url;
    }
    if (data.status === 'failed') throw new Error('seedance task failed');
  }
  throw new Error('seedance task timed out');
}

// Generate a short editorial caption using OpenAI
async function generateCaption(prompt, mediaType, env) {
  if (!env.OPENAI_API_KEY) return `a generated impression: ${prompt.slice(0, 60)}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `Write one short editorial caption (lowercase, under 18 words, evocative not literal) for a ${mediaType} generated from this prompt: "${prompt}". Reply with the caption only, no quotes.`,
        }],
      }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || `a generated impression: ${prompt.slice(0, 60)}`;
  } catch {
    return `a generated impression: ${prompt.slice(0, 60)}`;
  }
}
