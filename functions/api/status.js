import { requireAuth, json, err } from '../_auth.js';

export async function onRequestGet({ request, env }) {
  const user = await requireAuth(request, env);
  if (!user) return err('unauthorized', 401);

  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  if (!taskId) return err('taskId required');

  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/' + taskId, {
    headers: { 'Authorization': 'Bearer ' + env.SEEDANCE_API_KEY },
  });
  if (!res.ok) return err('poll failed ' + res.status);
  const data = await res.json();
  return json(data);
}
