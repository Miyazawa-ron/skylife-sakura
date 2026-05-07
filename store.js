// skyライフ · store · ai creative studio
// Connects to the skylife-image Cloudflare Worker via /api/*
// Auth: JWT stored in localStorage, sent as Authorization: Bearer <token>

(function () {
  const API = '/api';
  const TOKEN_KEY = 'sky.token.v1';
  const HIST_KEY = (email) => `sky.hist.${email}`;

  // ---- DOM helpers ----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---- token ----
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  // ---- API fetch ----
  async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + path, { ...opts, headers });
    return res;
  }

  // ---- session state ----
  let currentEmail = null;
  let currentCredits = 0;

  // ---- tab state ----
  let mode = 'login';

  $$('#tabs button').forEach(b => {
    b.addEventListener('click', () => {
      mode = b.dataset.tab;
      $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
      $('#name-field').style.display = mode === 'register' ? '' : 'none';
      $('#auth-submit').textContent = mode === 'register' ? 'register →' : 'login →';
      $('#auth-helper').textContent = mode === 'register'
        ? 'new members receive 100 credits.'
        : 'welcome back. members keep their credit balance.';
      $('#auth-err').textContent = '';
    });
  });

  // ---- auth form submit ----
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim().toLowerCase();
    const pw = $('#password').value;
    const name = ($('#uname')?.value || '').trim();
    const errEl = $('#auth-err');
    const submitBtn = $('#auth-submit');

    errEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'register' ? 'registering…' : 'logging in…';

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const body = mode === 'register'
        ? { email, password: pw, name: name || undefined }
        : { email, password: pw };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || (mode === 'register' ? 'registration failed.' : 'login failed.');
        return;
      }

      setToken(data.token);
      currentEmail = email;
      currentCredits = data.credits ?? 100;
      enterStudio(data);
    } catch (_err) {
      errEl.textContent = 'network error — please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'register' ? 'register →' : 'login →';
    }
  });

  // ---- studio enter / leave ----
  function enterStudio(userData) {
    $('#auth-section').style.display = 'none';
    $('#studio-section').style.display = '';

    const email = userData?.email || currentEmail || '—';
    currentEmail = email;
    currentCredits = userData?.credits ?? currentCredits;

    // session label: first 6 chars of email + hash fragment
    const label = email.length > 6
      ? email.slice(0, 6) + '·' + simpleHash(email).slice(0, 4)
      : email;
    $('#session-id').textContent = label;

    paintCredits();
    paintHistory();
  }

  function leaveStudio() {
    setToken(null);
    currentEmail = null;
    currentCredits = 0;
    $('#auth-section').style.display = '';
    $('#studio-section').style.display = 'none';
    $('#email').value = '';
    $('#password').value = '';
    $('#credit-num').textContent = '—';
  }

  $('#logout-btn').addEventListener('click', leaveStudio);

  function paintCredits() {
    $('#credit-num').textContent = String(currentCredits).padStart(3, '0');
  }

  function simpleHash(s) {
    let h = 0xdeadbeef ^ s.length;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0).toString(16);
  }

  // ---- model / ratio / prompt state ----
  let selectedModel = 'gpt-image';
  let selectedCost = 1;
  let selectedRatio = '1:1';

  $$('#model-grid .model').forEach(m => {
    m.addEventListener('click', () => {
      $$('#model-grid .model').forEach(x => x.classList.toggle('on', x === m));
      selectedModel = m.dataset.model;
      selectedCost = Number(m.dataset.cost);
      $('#cost-num').textContent = selectedCost;
      const isVideo = selectedModel === 'seedance-video';
      $$('#ratio-row .ratio').forEach(r => { r.style.opacity = isVideo ? '0.4' : '1'; });
    });
  });

  $$('#ratio-row .ratio').forEach(r => {
    r.addEventListener('click', () => {
      if (selectedModel === 'seedance-video') return;
      $$('#ratio-row .ratio').forEach(x => x.classList.toggle('on', x === r));
      selectedRatio = r.dataset.ratio;
    });
  });

  $('#prompt').addEventListener('input', (e) => {
    $('#char-count').textContent = `${e.target.value.length} / 500`;
  });

  // ---- generation ----
  $('#generate-btn').addEventListener('click', generate);

  async function generate() {
    const prompt = $('#prompt').value.trim();
    if (!prompt) { flashStamp('prompt required'); return; }
    if (currentCredits < selectedCost) { flashStamp('insufficient credits'); return; }

    setLoading(true);
    $('#caption').style.display = 'none';

    // Show SVG placeholder while waiting for the real image
    const placeholderArt = renderPlaceholder({ prompt, model: selectedModel, ratio: selectedRatio, seed: Date.now() });
    $('#stage').innerHTML = '';
    $('#stage').appendChild(placeholderArt);

    try {
      const res = await apiFetch('/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          aspect: selectedRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        flashStamp(data.error || 'generation failed');
        // Restore credits on client if server didn't deduct
        return;
      }

      currentCredits = data.credits ?? Math.max(0, currentCredits - selectedCost);
      paintCredits();

      showOutput({
        imageUrl: data.imageUrl || null,
        videoUrl: data.videoUrl || null,
        caption: data.caption || `a generated impression: ${prompt}`,
        prompt,
        model: selectedModel,
        ratio: selectedRatio,
        generationId: data.id || null,
      });

      pushHistory({
        imageUrl: data.imageUrl || null,
        videoUrl: data.videoUrl || null,
        caption: data.caption || '',
        prompt,
        model: selectedModel,
        ratio: selectedRatio,
        ts: Date.now(),
      });
    } catch (_err) {
      flashStamp('network error — try again');
    } finally {
      setLoading(false);
    }
  }

  function flashStamp(msg) {
    const el = $('#output-stamp');
    const prev = el.textContent;
    el.textContent = msg;
    el.style.color = 'var(--accent)';
    setTimeout(() => { el.textContent = prev; el.style.color = ''; }, 1800);
  }

  function setLoading(on) {
    const btn = $('#generate-btn');
    btn.disabled = on;
    btn.textContent = on ? 'generating …' : 'generate →';
    if (on) {
      // Keep placeholder in stage, overlay loading indicator
      const existing = $('#stage');
      // Remove any prior loading overlay
      const prior = existing.querySelector('.stage-loading');
      if (prior) prior.remove();
      const overlay = document.createElement('div');
      overlay.className = 'stage-loading';
      overlay.innerHTML = `
        <div>processing prompt</div>
        <div class="progressbar"><i></i></div>
        <div class="mono" style="font-size:10px;">model · ${selectedModel}</div>`;
      existing.appendChild(overlay);
      $('#output-stamp').textContent = 'rendering …';
    } else {
      const overlay = $('#stage .stage-loading');
      if (overlay) overlay.remove();
    }
  }

  function showOutput({ imageUrl, videoUrl, caption, prompt, model, ratio, generationId: _generationId }) {
    const stage = $('#stage');
    stage.innerHTML = '';

    if (videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      stage.appendChild(video);
    } else if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = prompt;
      img.loading = 'eager';
      stage.appendChild(img);
    } else {
      // Fallback: render SVG placeholder
      const art = renderPlaceholder({ prompt, model, ratio, seed: Date.now() });
      stage.appendChild(art);
    }

    const seed = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const cap = $('#caption');
    cap.style.display = '';
    cap.innerHTML = `
      <div>${escapeHtml(caption)}</div>
      <div class="meta">
        <span>${model === 'gpt-image' ? 'still · ' + ratio : 'video · 5s · 720p'}</span>
        <span>seed ${seed}</span>
        <span>prompt · ${escapeHtml(prompt.slice(0, 40))}${prompt.length > 40 ? '…' : ''}</span>
        ${imageUrl ? `<a class="download-link" href="${escapeHtml(imageUrl)}" download="skylife-gen-${seed}.jpg" target="_blank">↓ save</a>` : ''}
      </div>`;
    $('#output-stamp').textContent = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- SVG placeholder renderer (shown while loading / on fallback) ----
  function renderPlaceholder({ prompt: _prompt, model, ratio, seed }) {
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    const palette = ['#E86020', '#1a1a1a', '#f4f1ec'];

    const ratioMap = { '1:1': [600, 600], '3:2': [600, 400], '2:3': [400, 600], '16:9': [640, 360] };
    const [w, h] = model === 'seedance-video' ? [640, 360] : (ratioMap[ratio] || [600, 600]);

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('class', 'gen');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.background = palette[2];

    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.id = 'g' + seed;
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');
    [[palette[2], '0.95'], [palette[1], '0.35']].forEach(([c, op], i) => {
      const st = document.createElementNS(ns, 'stop');
      st.setAttribute('offset', i === 0 ? '0%' : '100%');
      st.setAttribute('stop-color', c);
      st.setAttribute('stop-opacity', op);
      grad.appendChild(st);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', w); bg.setAttribute('height', h);
    bg.setAttribute('fill', `url(#g${seed})`);
    svg.appendChild(bg);

    const horizon = h * (0.55 + rnd() * 0.2);
    const land = document.createElementNS(ns, 'rect');
    land.setAttribute('x', 0); land.setAttribute('y', horizon);
    land.setAttribute('width', w); land.setAttribute('height', h - horizon);
    land.setAttribute('fill', palette[1]); land.setAttribute('opacity', '0.28');
    svg.appendChild(land);

    const sunR = Math.min(w, h) * (0.06 + rnd() * 0.05);
    const sun = document.createElementNS(ns, 'circle');
    sun.setAttribute('cx', w * (0.25 + rnd() * 0.5));
    sun.setAttribute('cy', horizon - sunR * (0.3 + rnd() * 0.7));
    sun.setAttribute('r', sunR);
    sun.setAttribute('fill', palette[0]); sun.setAttribute('opacity', '0.85');
    svg.appendChild(sun);

    for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
      const bw = w * (0.06 + rnd() * 0.1);
      const bh = bw * (0.6 + rnd() * 0.5);
      const bx = w * (0.1 + rnd() * 0.8) - bw / 2;
      const by = horizon - bh + 2;
      const box = document.createElementNS(ns, 'rect');
      box.setAttribute('x', bx); box.setAttribute('y', by);
      box.setAttribute('width', bw); box.setAttribute('height', bh);
      box.setAttribute('fill', palette[1]); box.setAttribute('opacity', '0.85');
      svg.appendChild(box);
      const roof = document.createElementNS(ns, 'polygon');
      const peak = bh * 0.4;
      roof.setAttribute('points', `${bx - 2},${by} ${bx + bw + 2},${by} ${bx + bw / 2},${by - peak}`);
      roof.setAttribute('fill', palette[0]); roof.setAttribute('opacity', '0.92');
      svg.appendChild(roof);
    }

    for (let i = 0; i < 60; i++) {
      const x = rnd() * w, y = horizon + rnd() * (h - horizon);
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', x); ln.setAttribute('y1', y);
      ln.setAttribute('x2', x); ln.setAttribute('y2', y - (4 + rnd() * 10));
      ln.setAttribute('stroke', palette[1]); ln.setAttribute('stroke-width', '0.6'); ln.setAttribute('opacity', '0.5');
      svg.appendChild(ln);
    }

    const fr = document.createElementNS(ns, 'g');
    fr.setAttribute('font-family', '"JetBrains Mono", monospace');
    fr.setAttribute('font-size', '9');
    fr.setAttribute('fill', palette[1]);
    fr.setAttribute('opacity', '0.7');
    const tl = document.createElementNS(ns, 'text');
    tl.setAttribute('x', 12); tl.setAttribute('y', 18);
    tl.textContent = (model === 'seedance-video' ? 'video · 5.0s' : `still · ${ratio}`).toUpperCase();
    fr.appendChild(tl);
    const tr = document.createElementNS(ns, 'text');
    tr.setAttribute('x', w - 12); tr.setAttribute('y', 18); tr.setAttribute('text-anchor', 'end');
    tr.textContent = 'sky/studio · generating…';
    fr.appendChild(tr);
    svg.appendChild(fr);

    if (model === 'seedance-video') {
      const cb = document.createElementNS(ns, 'circle');
      cb.setAttribute('cx', w / 2); cb.setAttribute('cy', h / 2);
      cb.setAttribute('r', 28); cb.setAttribute('fill', '#fff'); cb.setAttribute('opacity', '0.9');
      svg.appendChild(cb);
      const tri = document.createElementNS(ns, 'polygon');
      const cx = w / 2, cy = h / 2;
      tri.setAttribute('points', `${cx - 8},${cy - 11} ${cx - 8},${cy + 11} ${cx + 12},${cy}`);
      tri.setAttribute('fill', palette[1]);
      svg.appendChild(tri);
    }

    return svg;
  }

  // ---- history (localStorage per user, last 6) ----
  function pushHistory(entry) {
    if (!currentEmail) return;
    const list = readJSON(HIST_KEY(currentEmail), []);
    list.unshift(entry);
    while (list.length > 6) list.pop();
    writeJSON(HIST_KEY(currentEmail), list);
    paintHistory();
  }

  function paintHistory() {
    if (!currentEmail) return;
    const list = readJSON(HIST_KEY(currentEmail), []);
    const row = $('#history-row');
    row.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const cell = document.createElement('div');
      if (!list[i]) {
        cell.className = 'history-cell empty';
        cell.textContent = 'empty';
      } else {
        cell.className = 'history-cell';
        cell.title = list[i].caption || list[i].prompt || '';

        if (list[i].imageUrl) {
          const img = document.createElement('img');
          img.src = list[i].imageUrl;
          img.alt = list[i].prompt || '';
          img.loading = 'lazy';
          cell.appendChild(img);
        } else {
          // SVG placeholder thumbnail from stored prompt
          const art = renderPlaceholder({
            prompt: list[i].prompt || '',
            model: list[i].model,
            ratio: list[i].ratio,
            seed: list[i].ts || i,
          });
          cell.appendChild(art);
        }

        const stamp = document.createElement('span');
        stamp.className = 'stamp';
        stamp.textContent = (i + 1).toString().padStart(2, '0');
        cell.appendChild(stamp);

        cell.addEventListener('click', () => restoreFromHistory(list[i]));
      }
      row.appendChild(cell);
    }

    $('#hist-count').textContent = list.length;
  }

  function restoreFromHistory(entry) {
    const stage = $('#stage');
    stage.innerHTML = '';

    if (entry.videoUrl) {
      const video = document.createElement('video');
      video.src = entry.videoUrl;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      stage.appendChild(video);
    } else if (entry.imageUrl) {
      const img = document.createElement('img');
      img.src = entry.imageUrl;
      img.alt = entry.prompt || '';
      stage.appendChild(img);
    } else {
      const art = renderPlaceholder({
        prompt: entry.prompt || '',
        model: entry.model,
        ratio: entry.ratio,
        seed: entry.ts || Date.now(),
      });
      stage.appendChild(art);
    }

    const cap = $('#caption');
    cap.style.display = '';
    cap.innerHTML = `
      <div>${escapeHtml(entry.caption || '')}</div>
      <div class="meta">
        <span>${entry.model === 'gpt-image' ? 'still · ' + entry.ratio : 'video · 5s · 720p'}</span>
        <span>from history · ${new Date(entry.ts).toLocaleString()}</span>
      </div>`;
    $('#output-stamp').textContent = 'history · ' + new Date(entry.ts).toISOString().slice(0, 19).replace('T', ' ');
  }

  // ---- language toggle (cosmetic) ----
  $$('#lang button').forEach(b => {
    b.addEventListener('click', () => {
      $$('#lang button').forEach(x => x.classList.toggle('on', x === b));
    });
  });

  // ---- init: check for existing valid session ----
  async function init() {
    const token = getToken();
    if (!token) return;

    try {
      const res = await apiFetch('/credits');
      if (res.ok) {
        const data = await res.json();
        currentEmail = data.email;
        currentCredits = data.credits;
        enterStudio(data);
      } else {
        // Token expired or invalid
        setToken(null);
      }
    } catch {
      // Offline or network error — clear token to be safe
      setToken(null);
    }
  }

  init();
})();
