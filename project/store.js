// ============ skyライフ · store · ai creative studio ============
// localStorage-backed prototype. No real backend — we render a styled
// placeholder using SVG and a Claude-generated caption so the loop feels alive.

(function () {
  const LS_USERS = 'sky.users.v1';
  const LS_SESSION = 'sky.session.v1';
  const LS_HIST = (email) => `sky.hist.${email}`;

  // ----- helpers -----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ----- auth state -----
  function getUsers() { return readJSON(LS_USERS, {}); }
  function setUsers(u) { writeJSON(LS_USERS, u); }
  function getSession() { return readJSON(LS_SESSION, null); }
  function setSession(s) { s ? writeJSON(LS_SESSION, s) : localStorage.removeItem(LS_SESSION); }

  // very simple hash so we don't store plaintext (NOT secure — prototype only)
  function hash(s) {
    let h = 0xdeadbeef ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    }
    return ((h ^ (h >>> 16)) >>> 0).toString(16);
  }

  // ----- tabs -----
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

  // ----- auth submit -----
  $('#auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#email').value.trim().toLowerCase();
    const pw = $('#password').value;
    const name = ($('#name')?.value || '').trim();
    const err = $('#auth-err');
    err.textContent = '';
    if (!email || !pw) { err.textContent = 'email and password required.'; return; }

    const users = getUsers();
    if (mode === 'register') {
      if (users[email]) { err.textContent = 'an account already exists for this email. try login.'; return; }
      users[email] = {
        email,
        name: name || email.split('@')[0],
        pwhash: hash(pw),
        credits: 100,
        joined: new Date().toISOString(),
      };
      setUsers(users);
      setSession({ email });
      enterStudio();
    } else {
      const u = users[email];
      if (!u) { err.textContent = 'no account for this email. switch to register.'; return; }
      if (u.pwhash !== hash(pw)) { err.textContent = 'password does not match.'; return; }
      setSession({ email });
      enterStudio();
    }
  });

  // ----- studio enter / leave -----
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    const users = getUsers();
    return users[s.email] || null;
  }
  function saveUser(u) {
    const users = getUsers();
    users[u.email] = u;
    setUsers(users);
  }
  function enterStudio() {
    const u = currentUser();
    if (!u) return;
    $('#auth-section').style.display = 'none';
    $('#studio-section').style.display = '';
    $('#session-id').textContent = u.email.slice(0, 6) + '·' + hash(u.email).slice(0, 4);
    paintCredits();
    paintHistory();
  }
  function leaveStudio() {
    setSession(null);
    $('#auth-section').style.display = '';
    $('#studio-section').style.display = 'none';
    $('#email').value = '';
    $('#password').value = '';
    $('#credit-num').textContent = '—';
  }
  $('#logout-btn').addEventListener('click', leaveStudio);

  function paintCredits() {
    const u = currentUser();
    $('#credit-num').textContent = u ? String(u.credits).padStart(3, '0') : '—';
  }

  // ----- model + ratio + prompt -----
  let model = 'gpt-image';
  let cost = 1;
  let ratio = '1:1';

  $$('#model-grid .model').forEach(m => {
    m.addEventListener('click', () => {
      $$('#model-grid .model').forEach(x => x.classList.toggle('on', x === m));
      model = m.dataset.model;
      cost = Number(m.dataset.cost);
      $('#cost-num').textContent = cost;
      // disable aspect picks for video
      $$('#ratio-row .ratio').forEach(r => r.style.opacity = model === 'seedance-video' ? 0.4 : 1);
    });
  });
  $$('#ratio-row .ratio').forEach(r => {
    r.addEventListener('click', () => {
      if (model === 'seedance-video') return;
      $$('#ratio-row .ratio').forEach(x => x.classList.toggle('on', x === r));
      ratio = r.dataset.ratio;
    });
  });
  $('#prompt').addEventListener('input', (e) => {
    $('#char-count').textContent = `${e.target.value.length} / 500`;
  });

  // ----- generation -----
  $('#generate-btn').addEventListener('click', generate);

  async function generate() {
    const u = currentUser();
    if (!u) return;
    const prompt = $('#prompt').value.trim();
    if (!prompt) {
      flashStamp('prompt required');
      return;
    }
    if (u.credits < cost) {
      flashStamp('insufficient credits');
      return;
    }

    // deduct credits up front
    u.credits -= cost;
    saveUser(u);
    paintCredits();

    setLoading(true);
    $('#caption').style.display = 'none';

    // ask claude for a short editorial caption + a palette suggestion
    let caption = '';
    let palette = ['#E86020', '#1a1a1a', '#f4f1ec'];
    try {
      const text = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `You are an art director at a quiet japanese-editorial studio. A user just generated an image with the prompt below.

Prompt: "${prompt}"
Model: ${model === 'gpt-image' ? 'still image' : '5-second video clip'}
Aspect: ${ratio}

Reply with strict JSON only:
{
  "caption": "<one-sentence editorial caption, lowercase, under 18 words, evocative not literal>",
  "palette": ["#hex1","#hex2","#hex3"]   // 3 muted colors that fit the prompt; avoid pure black/white
}`
        }],
      });
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed.caption) caption = parsed.caption;
        if (Array.isArray(parsed.palette) && parsed.palette.length >= 3) palette = parsed.palette.slice(0, 3);
      }
    } catch (e) {
      caption = `a generated impression of: ${prompt}`;
    }
    if (!caption) caption = `a generated impression of: ${prompt}`;

    // build artwork
    const art = renderArtwork({ prompt, model, ratio, palette, seed: Date.now() });

    // commit
    setLoading(false);
    showOutput({ art, caption, prompt, model, ratio, palette });
    pushHistory({ art, caption, prompt, model, ratio, palette, ts: Date.now() });
  }

  function flashStamp(msg) {
    const s = $('#output-stamp');
    const prev = s.textContent;
    s.textContent = msg;
    s.style.color = 'var(--accent)';
    setTimeout(() => { s.textContent = prev; s.style.color = ''; }, 1600);
  }

  function setLoading(on) {
    const stage = $('#stage');
    const btn = $('#generate-btn');
    btn.disabled = on;
    btn.textContent = on ? 'generating …' : 'generate →';
    if (on) {
      stage.innerHTML = `
        <div class="stage-loading">
          <div>processing prompt</div>
          <div class="progressbar"><i></i></div>
          <div class="mono" style="font-size:10px;">model · ${model}</div>
        </div>`;
      $('#output-stamp').textContent = 'rendering …';
    }
  }

  function showOutput({ art, caption, prompt, model, ratio }) {
    const stage = $('#stage');
    stage.innerHTML = '';
    stage.appendChild(art.cloneNode(true));
    const cap = $('#caption');
    cap.style.display = '';
    cap.innerHTML = `
      <div>${escapeHtml(caption)}</div>
      <div class="meta">
        <span>${model === 'gpt-image' ? 'still · ' + ratio : 'video · 5s · 720p'}</span>
        <span>seed ${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}</span>
        <span>prompt · ${escapeHtml(prompt.slice(0, 40))}${prompt.length > 40 ? '…' : ''}</span>
      </div>`;
    $('#output-stamp').textContent = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ----- artwork renderer (SVG placeholder, palette-driven) -----
  function renderArtwork({ prompt, model, ratio, palette, seed }) {
    // simple seeded rng
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };

    const ratioMap = { '1:1': [600, 600], '3:2': [600, 400], '2:3': [400, 600], '16:9': [640, 360] };
    const [w, h] = model === 'seedance-video' ? [640, 360] : (ratioMap[ratio] || [600, 600]);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('class', 'gen');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.background = palette[2] || '#f4f1ec';

    // backdrop gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'g' + seed);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');
    [palette[2], palette[1]].forEach((c, i) => {
      const st = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      st.setAttribute('offset', i === 0 ? '0%' : '100%');
      st.setAttribute('stop-color', c);
      st.setAttribute('stop-opacity', i === 0 ? '0.95' : '0.35');
      grad.appendChild(st);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', w); bg.setAttribute('height', h);
    bg.setAttribute('fill', `url(#g${seed})`);
    svg.appendChild(bg);

    // horizon
    const horizon = h * (0.55 + rnd() * 0.2);
    const land = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    land.setAttribute('x', 0); land.setAttribute('y', horizon);
    land.setAttribute('width', w); land.setAttribute('height', h - horizon);
    land.setAttribute('fill', palette[1]);
    land.setAttribute('opacity', '0.28');
    svg.appendChild(land);

    // sun / moon
    const sunR = Math.min(w, h) * (0.06 + rnd() * 0.05);
    const sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    sun.setAttribute('cx', w * (0.25 + rnd() * 0.5));
    sun.setAttribute('cy', horizon - sunR * (0.3 + rnd() * 0.7));
    sun.setAttribute('r', sunR);
    sun.setAttribute('fill', palette[0]);
    sun.setAttribute('opacity', '0.85');
    svg.appendChild(sun);

    // a few simple structures (boxes = guesthouses)
    const boxCount = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < boxCount; i++) {
      const bw = w * (0.06 + rnd() * 0.1);
      const bh = bw * (0.6 + rnd() * 0.5);
      const bx = w * (0.1 + rnd() * 0.8) - bw / 2;
      const by = horizon - bh + 2;
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('x', bx); box.setAttribute('y', by);
      box.setAttribute('width', bw); box.setAttribute('height', bh);
      box.setAttribute('fill', palette[1]);
      box.setAttribute('opacity', '0.85');
      svg.appendChild(box);
      // roof
      const roof = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const peak = bh * 0.4;
      roof.setAttribute('points', `${bx - 2},${by} ${bx + bw + 2},${by} ${bx + bw / 2},${by - peak}`);
      roof.setAttribute('fill', palette[0]);
      roof.setAttribute('opacity', '0.92');
      svg.appendChild(roof);
      // window
      const win = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      win.setAttribute('x', bx + bw * 0.3);
      win.setAttribute('y', by + bh * 0.45);
      win.setAttribute('width', bw * 0.4);
      win.setAttribute('height', bh * 0.25);
      win.setAttribute('fill', palette[2]);
      win.setAttribute('opacity', '0.9');
      svg.appendChild(win);
    }

    // grass strokes
    for (let i = 0; i < 60; i++) {
      const x = rnd() * w;
      const y = horizon + rnd() * (h - horizon);
      const len = 4 + rnd() * 10;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', x); ln.setAttribute('y1', y);
      ln.setAttribute('x2', x); ln.setAttribute('y2', y - len);
      ln.setAttribute('stroke', palette[1]);
      ln.setAttribute('stroke-width', '0.6');
      ln.setAttribute('opacity', '0.5');
      svg.appendChild(ln);
    }

    // film grain dots
    for (let i = 0; i < 240; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', rnd() * w);
      c.setAttribute('cy', rnd() * h);
      c.setAttribute('r', rnd() * 0.7);
      c.setAttribute('fill', palette[1]);
      c.setAttribute('opacity', rnd() * 0.15);
      svg.appendChild(c);
    }

    // editorial frame label
    const fr = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fr.setAttribute('font-family', '"JetBrains Mono", monospace');
    fr.setAttribute('font-size', '9');
    fr.setAttribute('fill', palette[1]);
    fr.setAttribute('opacity', '0.7');
    const txtTL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txtTL.setAttribute('x', 12); txtTL.setAttribute('y', 18);
    txtTL.textContent = (model === 'seedance-video' ? 'video · 5.0s' : `still · ${ratio}`).toUpperCase();
    fr.appendChild(txtTL);
    const txtTR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txtTR.setAttribute('x', w - 12); txtTR.setAttribute('y', 18);
    txtTR.setAttribute('text-anchor', 'end');
    txtTR.textContent = 'sky/studio · ' + new Date().toISOString().slice(0, 10);
    fr.appendChild(txtTR);
    const txtBL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txtBL.setAttribute('x', 12); txtBL.setAttribute('y', h - 12);
    const short = prompt.slice(0, Math.floor(w / 6));
    txtBL.textContent = '"' + short + (prompt.length > short.length ? '…' : '') + '"';
    fr.appendChild(txtBL);
    svg.appendChild(fr);

    // play button overlay if video
    if (model === 'seedance-video') {
      const btn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const cb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cb.setAttribute('cx', w / 2); cb.setAttribute('cy', h / 2);
      cb.setAttribute('r', 28);
      cb.setAttribute('fill', '#fff');
      cb.setAttribute('opacity', '0.9');
      btn.appendChild(cb);
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const cx = w / 2, cy = h / 2;
      tri.setAttribute('points', `${cx - 8},${cy - 11} ${cx - 8},${cy + 11} ${cx + 12},${cy}`);
      tri.setAttribute('fill', palette[1]);
      btn.appendChild(tri);
      svg.appendChild(btn);
    }

    return svg;
  }

  // ----- history (last 6, per-user) -----
  function pushHistory(entry) {
    const u = currentUser();
    if (!u) return;
    // store SVG as serialized string so it survives reload
    const ser = new XMLSerializer().serializeToString(entry.art);
    const list = readJSON(LS_HIST(u.email), []);
    list.unshift({ ...entry, art: ser });
    while (list.length > 6) list.pop();
    writeJSON(LS_HIST(u.email), list);
    paintHistory();
  }
  function paintHistory() {
    const u = currentUser();
    if (!u) return;
    const list = readJSON(LS_HIST(u.email), []);
    const row = $('#history-row');
    row.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const cell = document.createElement('div');
      cell.className = 'history-cell' + (list[i] ? '' : ' empty');
      if (list[i]) {
        cell.innerHTML = list[i].art;
        const stamp = document.createElement('span');
        stamp.className = 'stamp';
        stamp.textContent = (i + 1).toString().padStart(2, '0');
        cell.appendChild(stamp);
        cell.title = list[i].caption;
        cell.addEventListener('click', () => {
          const tmp = document.createElement('div');
          tmp.innerHTML = list[i].art;
          const svg = tmp.querySelector('svg');
          const stage = $('#stage');
          stage.innerHTML = '';
          stage.appendChild(svg);
          $('#caption').style.display = '';
          $('#caption').innerHTML = `<div>${escapeHtml(list[i].caption)}</div>
            <div class="meta">
              <span>${list[i].model === 'gpt-image' ? 'still · ' + list[i].ratio : 'video · 5s · 720p'}</span>
              <span>from history · ${new Date(list[i].ts).toLocaleString()}</span>
            </div>`;
          $('#output-stamp').textContent = 'history · ' + new Date(list[i].ts).toISOString().slice(0, 19).replace('T', ' ');
        });
      } else {
        cell.textContent = 'empty';
      }
      row.appendChild(cell);
    }
    $('#hist-count').textContent = list.length;
  }

  // ----- init -----
  // language toggle (homepage parity, visual only)
  $$('#lang button').forEach(b => {
    b.addEventListener('click', () => {
      $$('#lang button').forEach(x => x.classList.toggle('on', x === b));
    });
  });

  if (currentUser()) enterStudio();
})();
