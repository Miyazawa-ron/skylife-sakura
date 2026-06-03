/* =========================================================
   SKY ライフ — BLUEPRINT IN MOTION
   GSAP engine: smooth scroll, splittext, reveals, pin,
   magnetic, custom cursor, page transitions
   ========================================================= */
(function () {
  const gsap = window.gsap;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const isMobile = window.matchMedia('(max-width:760px)').matches;

  /* ------------------------------------------------------ */
  /*  LOADER  → builds an intro timeline, then boots site    */
  /* ------------------------------------------------------ */
  function runLoader(done) {
    const loader = document.querySelector('.loader');
    if (!loader || prefersReduce) { if (loader) loader.remove(); done(); return; }
    const bar = loader.querySelector('.loader__bar i');
    const count = loader.querySelector('.loader__count .num');
    const obj = { v: 0 };
    const tl = gsap.timeline({ onComplete: () => {
      // fade out (loader is position:fixed — avoid yPercent so ScrollSmoother
      // can't add a counter-transform that strands it on screen)
      gsap.to(loader, { opacity: 0, duration: 0.7, ease: 'power2.inOut',
        onComplete: () => { loader.remove(); done(); } });
    }});
    tl.to(obj, { v: 100, duration: 1.5, ease: 'power2.inOut',
      onUpdate: () => {
        const n = Math.round(obj.v);
        count.textContent = String(n).padStart(3, '0');
        bar.style.width = n + '%';
      }});
  }

  /* ------------------------------------------------------ */
  /*  SMOOTH SCROLL                                          */
  /* ------------------------------------------------------ */
  let smoother = null;
  let workST    = null;   // ScrollTrigger ref for the products pin

  function initSmooth() {
    if (prefersReduce) return;
    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.15,
      effects: true,           // enables data-speed / data-lag parallax
      // normalizeScroll is disabled on every device:
      //  · desktop — its JS wheel-driver fought the manual scroll-clamp in
      //    initWorkScrollLock, letting the page escape past the products pin.
      //  · mobile — it preventDefaults touchmove to take over scrolling, which
      //    killed the native horizontal swipe of the PRODUCTS card track, so
      //    only the first cards were reachable. Native touch scroll is fine.
      normalizeScroll: false,
    });
  }

  /* ------------------------------------------------------ */
  /*  CUSTOM CURSOR                                          */
  /* ------------------------------------------------------ */
  function initCursor() {
    // Custom cursor removed by request — native cursor restored.
    // Mouse-triggered effects (magnetic, hover fills, parallax) remain active.
    return;
  }
  /* eslint-disable no-unused-vars */
  function initCursorLegacy() {
    const cur = document.querySelector('.cursor');
    if (!cur) return;
    document.body.classList.add('cursor-ready');
    const dot = cur.querySelector('.cursor__dot');
    const ring = cur.querySelector('.cursor__ring');
    const label = cur.querySelector('.cursor__label');

    const xDot = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const yDot = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const xRing = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    const yRing = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    const xLab = gsap.quickTo(label, 'x', { duration: 0.45, ease: 'power3' });
    const yLab = gsap.quickTo(label, 'y', { duration: 0.45, ease: 'power3' });

    window.addEventListener('pointermove', (e) => {
      xDot(e.clientX); yDot(e.clientY);
      xRing(e.clientX); yRing(e.clientY);
      xLab(e.clientX); yLab(e.clientY + 34);
    });

    // hover affordances
    const grow = (scale, txt) => {
      gsap.to(ring, { scale, duration: 0.35, ease: 'power3' });
      if (txt !== undefined) { label.textContent = txt; gsap.to(label, { opacity: txt ? 1 : 0, duration: 0.25 }); }
    };
    document.querySelectorAll('a, button, [data-cursor]').forEach((el) => {
      const txt = el.getAttribute('data-cursor');
      el.addEventListener('pointerenter', () => grow(txt ? 1.9 : 1.55, txt || ''));
      el.addEventListener('pointerleave', () => grow(1, ''));
    });
    window.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
    window.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.2 }));
  }
  /* eslint-enable no-unused-vars */

  /* ------------------------------------------------------ */
  /*  MAGNETIC elements                                      */
  /* ------------------------------------------------------ */
  function initMagnetic() {
    if (!fine) return;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.getAttribute('data-magnetic')) || 0.4;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* link underline animation (nav + footer) */
  function initUnderlines() {
    document.querySelectorAll('.nav a .u').forEach((u) => {
      const a = u.closest('a');
      a.addEventListener('pointerenter', () => gsap.fromTo(u, { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.4, ease: 'power3' }));
      a.addEventListener('pointerleave', () => gsap.to(u, { scaleX: 0, transformOrigin: 'right', duration: 0.35, ease: 'power3' }));
    });
  }

  /* ------------------------------------------------------ */
  /*  HEADER theme switching over paper sections             */
  /* ------------------------------------------------------ */
  function initHeaderTheme() {
    const head = document.querySelector('.head');
    document.querySelectorAll('.theme-paper').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 60px', end: 'bottom 60px',
        onToggle: (self) => head.classList.toggle('is-dark', self.isActive),
      });
    });
  }

  /* ------------------------------------------------------ */
  /*  HERO intro                                             */
  /* ------------------------------------------------------ */
  function initHero() {
    const h1 = document.querySelector('.hero h1');
    let lines = [];
    if (h1 && !prefersReduce) {
      const split = new SplitText(h1.querySelectorAll('.row'), { type: 'chars', charsClass: 'ch' });
      lines = split.chars;
    }
    const tl = gsap.timeline({ delay: 0.15 });
    if (lines.length) {
      gsap.set(lines, { yPercent: 115 });
      tl.to(lines, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.018 }, 0);
    }
    tl.from('.hero__kbar', { scaleX: 0, transformOrigin: 'left', duration: 1, ease: 'power3.out' }, 0.1)
      .from('.hero__sub > *', { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0.5)
      .from('.hero__readout', { opacity: 0, duration: 1 }, 0.7);

    // blueprint draw-in
    const paths = document.querySelectorAll('.hero__blue .bp');
    paths.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 1000;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.06 }, 0.2);
    tl.from('.hero__blue .anno', { opacity: 0, duration: 0.8, stagger: 0.05 }, 0.9);

    // hero parallax on scroll
    if (!prefersReduce) {
      gsap.to('.hero__blue', { yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__inner', { yPercent: -8, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }

    // mouse parallax of blueprint
    if (fine && !prefersReduce) {
      const blue = document.querySelector('.hero__blue svg');
      const xTo = gsap.quickTo(blue, 'x', { duration: 1.1, ease: 'power3' });
      const yTo = gsap.quickTo(blue, 'y', { duration: 1.1, ease: 'power3' });
      document.querySelector('.hero').addEventListener('pointermove', (e) => {
        const cx = (e.clientX / window.innerWidth - 0.5);
        const cy = (e.clientY / window.innerHeight - 0.5);
        xTo(cx * 40); yTo(cy * 30);
      });
    }
  }

  /* ------------------------------------------------------ */
  /*  GENERIC REVEALS                                        */
  /* ------------------------------------------------------ */
  function initReveals() {
    // fade / rise blocks
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      const d = el.getAttribute('data-reveal');
      let from = { y: 40, opacity: 0 };
      if (d === 'up-lg') from = { y: 90, opacity: 0 };
      if (d === 'fade') from = { opacity: 0 };
      if (d === 'left') from = { x: -50, opacity: 0 };
      gsap.from(el, {
        ...from, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    // staggered groups
    gsap.utils.toArray('[data-stagger]').forEach((group) => {
      const kids = group.children;
      gsap.from(kids, {
        y: 34, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 85%' },
      });
    });

    // line-by-line text reveal for big statements
    gsap.utils.toArray('[data-lines]').forEach((el) => {
      const split = new SplitText(el, { type: 'lines', linesClass: 'split-line' });
      const inner = new SplitText(split.lines, { type: 'lines' });
      gsap.set(inner.lines, { yPercent: 110 });
      gsap.to(inner.lines, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });
    });

    // section index lines + headings small slide
    gsap.utils.toArray('.sec-head, .work__head, .foot__cta').forEach((el) => {
      gsap.from(el.children, {
        y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });
  }

  /* ------------------------------------------------------ */
  /*  NUMBER COUNTERS                                        */
  /* ------------------------------------------------------ */
  function initCounters() {
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const end = parseFloat(el.getAttribute('data-count'));
      const dec = (el.getAttribute('data-count').split('.')[1] || '').length;
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out',
          onUpdate: () => { el.textContent = obj.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } }),
      });
    });
  }

  /* ------------------------------------------------------ */
  /*  HORIZONTAL PIN (products)                              */
  /* ------------------------------------------------------ */
  function initHorizontal() {
    if (isMobile || prefersReduce) return;
    const pin = document.querySelector('.pin');
    const track = document.querySelector('.track');
    if (!pin || !track) return;

    const cards = gsap.utils.toArray('.card');
    const fill = document.querySelector('.work__scrub-fill');
    const knob = document.querySelector('.work__scrub-knob');
    const scrub = document.querySelector('.work__scrub');
    const btnPrev = document.querySelector('[data-nav="prev"]');
    const btnNext = document.querySelector('[data-nav="next"]');

    const getScrollAmount = () => Math.max(1, track.scrollWidth - window.innerWidth);

    let dragging = false; // true while the user controls position directly

    const tween = gsap.to(track, {
      x: () => -getScrollAmount(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.work',
        start: 'top top',
        end: () => '+=' + getScrollAmount(),
        pin: '.work',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (!dragging) setUI(self.progress); updateBtns(self.progress); },
      },
    });
    const st = tween.scrollTrigger;
    workST = st; // expose to the window-level scroll lock

    function setUI(p) {
      if (fill) fill.style.width = (p * 100) + '%';
      if (knob) knob.style.left = (p * 100) + '%';
      if (scrub) scrub.setAttribute('aria-valuenow', Math.round(p * 100));
    }
    function updateBtns(p) {
      if (btnPrev) btnPrev.disabled = p <= 0.002;
      if (btnNext) btnNext.disabled = p >= 0.998;
    }
    function progToY(p) { return st.start + p * (st.end - st.start); }
    function goTo(p, smooth) {
      p = Math.max(0, Math.min(1, p));
      const y = progToY(p);
      if (smoother) smoother.scrollTo(y, !!smooth);
      else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    }
    function cardProgresses() {
      const amt = getScrollAmount();
      return cards.map((c) => Math.max(0, Math.min(1, c.offsetLeft / amt)));
    }

    // prev / next jump card-by-card
    btnNext && btnNext.addEventListener('click', () => {
      const ps = cardProgresses(), cur = st.progress;
      const nxt = ps.find((p) => p > cur + 0.01);
      goTo(nxt != null ? nxt : 1, true);
    });
    btnPrev && btnPrev.addEventListener('click', () => {
      const ps = cardProgresses(), cur = st.progress;
      const prev = [...ps].reverse().find((p) => p < cur - 0.01);
      goTo(prev != null ? prev : 0, true);
    });

    // draggable scrubber
    function ratioFromEvent(e) {
      const r = scrub.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }
    function scrubMove(e) { if (!dragging) return; const p = ratioFromEvent(e); setUI(p); goTo(p, false); }
    function scrubEnd() { dragging = false; scrub.classList.remove('dragging');
      window.removeEventListener('pointermove', scrubMove); window.removeEventListener('pointerup', scrubEnd); }
    scrub && scrub.addEventListener('pointerdown', (e) => {
      dragging = true; scrub.classList.add('dragging');
      const p = ratioFromEvent(e); setUI(p); goTo(p, false);
      window.addEventListener('pointermove', scrubMove); window.addEventListener('pointerup', scrubEnd);
      e.preventDefault();
    });
    // keyboard on scrubber
    scrub && scrub.addEventListener('keydown', (e) => {
      const step = 1 / (cards.length - 1);
      if (e.key === 'ArrowRight') { goTo(st.progress + step, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { goTo(st.progress - step, true); e.preventDefault(); }
    });

    // grab-drag the cards themselves
    let cardDrag = false, startX = 0, startP = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.work__nav')) return;
      cardDrag = true; moved = false; startX = e.clientX; startP = st.progress;
      track.classList.add('grabbing');
    });
    window.addEventListener('pointermove', (e) => {
      if (!cardDrag) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      dragging = true;
      const p = Math.max(0, Math.min(1, startP - dx / getScrollAmount()));
      setUI(p); goTo(p, false);
    });
    window.addEventListener('pointerup', () => {
      if (!cardDrag) return;
      cardDrag = false; dragging = false; track.classList.remove('grabbing');
    });

    // workST is already set above; mouseenter/leave tracking + wheel
    // interception is handled by initWorkScrollLock (registered before GSAP).


    // block card link navigation when user was dragging (not just clicking)
    track.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); moved = false; }
    }, true);

    setUI(0); updateBtns(0);
    ScrollTrigger.addEventListener('refreshInit', () => setUI(st ? st.progress : 0));
  }

  /* ------------------------------------------------------ */
  /*  CARD svg draw on hover                                 */
  /* ------------------------------------------------------ */
  function initCardSvg() {
    document.querySelectorAll('.card').forEach((card) => {
      const paths = card.querySelectorAll('.card__svg .cl');
      paths.forEach((p) => {
        const len = p.getTotalLength ? p.getTotalLength() : 0;
        if (len) { p.style.strokeDasharray = len; }
      });
      card.addEventListener('pointerenter', () => {
        paths.forEach((p) => {
          const len = p.getTotalLength ? p.getTotalLength() : 0;
          if (!len) return;
          gsap.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' });
        });
      });
    });
  }

  /* ------------------------------------------------------ */
  /*  MARQUEE strip                                          */
  /* ------------------------------------------------------ */
  function initMarquee() {
    document.querySelectorAll('.strip__track').forEach((track) => {
      const dir = track.classList.contains('rev') ? 1 : -1;
      // duplicate content for seamless loop
      track.innerHTML += track.innerHTML;
      const total = track.scrollWidth / 2;
      gsap.set(track, { x: dir < 0 ? 0 : -total });
      const tween = gsap.to(track, { x: dir < 0 ? -total : 0, duration: 22, ease: 'none', repeat: -1 });
      // velocity-skew on scroll
      if (!prefersReduce) {
        ScrollTrigger.create({
          trigger: track, start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => { gsap.to(tween, { timeScale: 1 + Math.abs(self.getVelocity() / 1200), duration: 0.3 }); },
        });
      }
    });
  }

  /* footer wordmark parallax */
  function initFootWord() {
    if (prefersReduce) return;
    const t = document.querySelector('.foot__word text');
    if (!t) return;
    gsap.fromTo(t, { x: '-6%' }, { x: '6%', ease: 'none',
      scrollTrigger: { trigger: '.foot__word', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ------------------------------------------------------ */
  /*  PAGE TRANSITIONS                                       */
  /* ------------------------------------------------------ */
  function initPageTransition() {
    const pt = document.querySelector('.pt');
    const panel = pt && pt.querySelector('.pt__panel');
    const mark = document.querySelector('.pt__mark');
    if (!pt || !panel) return;

    let leaving = false;
    function leave(href) {
      if (leaving) return;
      leaving = true;
      const tl = gsap.timeline({ onComplete: () => { window.location.href = href; } });
      tl.set(mark, { opacity: 0 })
        .fromTo(panel, { yPercent: 101 }, { yPercent: 0, duration: 0.6, ease: 'power4.inOut' })
        .to(mark, { opacity: 1, duration: 0.25 }, '-=0.2')
        .to({}, { duration: 0.15 });
    }

    document.querySelectorAll('a[data-transition]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || a.target === '_blank') return;
        e.preventDefault();
        leave(href);
      });
    });
  }

  /* ------------------------------------------------------ */
  /*  LANGUAGE toggle (EN / JP emphasis)                     */
  /* ------------------------------------------------------ */
  function initLang() {
    const KEY = 'sky-lang';
    const allBtns = () => document.querySelectorAll('button[data-lang]');
    const apply = (lang) => {
      document.body.setAttribute('data-lang', lang);
      allBtns().forEach((x) => x.classList.toggle('on', x.dataset.lang === lang));
      try { localStorage.setItem(KEY, lang); } catch (e) {}
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    let saved = 'en';
    try { saved = localStorage.getItem(KEY) || 'en'; } catch (e) {}
    apply(saved);
    // bind after a tick so mob-menu buttons are in the DOM
    setTimeout(() => {
      allBtns().forEach((b) => b.addEventListener('click', () => apply(b.dataset.lang)));
    }, 0);
  }

  /* ------------------------------------------------------ */
  /*  WORK SECTION SCROLL LOCK                               */
  /*  Must be registered on window BEFORE GSAP's listeners  */
  /*  so stopImmediatePropagation() fires first.             */
  /* ------------------------------------------------------ */
  function initWorkScrollLock() {
    if (isMobile || prefersReduce) return;
    const workEl = document.querySelector('.work');
    if (!workEl) return;

    // Hit-test the pointer against .work's live bounding rect on every wheel
    // event instead of trusting mouseenter/mouseleave. While the section is
    // pinned, ScrollTrigger shifts the element exactly at the pin boundaries,
    // which fired a spurious mouseleave and dropped the lock right when the
    // user reached the left/right end — letting the page escape into vertical
    // scroll. Geometry never lies.
    let mx = -1, my = -1;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const pointerOverWork = () => {
      if (my < 0) return false;
      const r = workEl.getBoundingClientRect();
      return my >= r.top && my <= r.bottom && mx >= r.left && mx <= r.right;
    };

    const getScroll = () => (smoother ? smoother.scrollTop() : window.scrollY);
    const setScroll = (v) => { smoother ? smoother.scrollTo(v, false) : window.scrollTo(0, v); };

    // `target` is the single source of truth for the locked scroll position.
    // Reading the (smoothed, lagging) scrollTop back each frame and writing it
    // again created a feedback loop that let momentum leak past the boundary.
    // This is driven purely by wheel delta and hard-clamped to the pin range.
    let target = null;

    // ── Layer 1: intercept wheel on window capture phase (before GSAP) ──
    window.addEventListener('wheel', (e) => {
      const cur = getScroll();
      // Engage only while inside the pin band AND the pointer is over the
      // section; otherwise scroll normally so the section can be reached/left.
      if (!workST || cur < workST.start - 2 || cur > workST.end + 2 || !pointerOverWork()) {
        target = null;
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      // (Re)sync if drag / prev-next / scrubber moved the scroll out from under us.
      if (target === null || Math.abs(cur - target) > 8) target = cur;
      target = Math.max(workST.start, Math.min(workST.end, target + delta));
      setScroll(target);
    }, { passive: false, capture: true });

    // ── Layer 2: gsap.ticker safety net ──
    // While the lock is engaged, clamp any escape (momentum / inertia) back
    // every frame. Only runs when locked, so it never snaps the page in/out.
    gsap.ticker.add(() => {
      if (target === null || !workST) return;
      const cur = getScroll();
      if (cur < workST.start - 1) setScroll(workST.start);
      else if (cur > workST.end + 1) setScroll(workST.end);
    });
  }

  /* ------------------------------------------------------ */
  /*  HAMBURGER mobile drawer                                */
  /* ------------------------------------------------------ */
  function initHamburger() {
    const btn  = document.querySelector('.hamburger');
    const menu = document.querySelector('.mob-menu');
    if (!btn || !menu) return;
    const open = () => {
      btn.classList.add('is-open'); menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-open');
    };
    const close = () => {
      btn.classList.remove('is-open'); menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
    };
    btn.addEventListener('click', () => btn.classList.contains('is-open') ? close() : open());
    const closeBtn = menu.querySelector('.mob-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    menu.querySelectorAll('.mob-link').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ------------------------------------------------------ */
  /*  BOOT                                                   */
  /* ------------------------------------------------------ */
  function boot() {
    const safe = (fn) => { try { fn(); } catch (e) { console.warn('[sky] init skipped:', e && e.message); } };
    safe(initWorkScrollLock); // must run BEFORE initSmooth so our window listener is first
    safe(initSmooth);
    safe(initCursor);
    safe(initMagnetic);
    safe(initUnderlines);
    safe(initLang);
    safe(initHamburger);
    safe(initHeaderTheme);
    safe(initMarquee);

    const isHome = document.body.getAttribute('data-page') === 'home';
    if (isHome) {
      safe(initHero);
      safe(initHorizontal);
      safe(initCardSvg);
    }
    safe(initReveals);
    safe(initCounters);
    safe(initFootWord);
    safe(initPageTransition);

    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
      window.addEventListener('load', () => ScrollTrigger.refresh());
    }
  }

  // safety net: a stranded overlay (e.g. bfcache restore after a transition)
  // must never block the page. Park the panel below the fold on every show.
  function resetOverlay() {
    const panel = document.querySelector('.pt__panel');
    const mark = document.querySelector('.pt__mark');
    if (panel) gsap.set(panel, { yPercent: 101, clearProps: 'opacity' });
    if (mark) gsap.set(mark, { opacity: 0 });
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) resetOverlay(); });

  document.documentElement.classList.remove('no-js');
  // kick off: loader → entry reveal → boot
  let booted = false;
  function bootOnce() { if (booted) return; booted = true; boot(); }

  function start() {
    const loader = document.querySelector('.loader');
    if (loader) {
      runLoader(bootOnce);
      // hard fallback: if the loader ever stalls (e.g. the page loaded in a
      // hidden tab so GSAP's rAF ticker never advanced), force it away and boot.
      setTimeout(() => {
        if (booted) return;
        gsap.killTweensOf(loader);
        loader.remove();
        bootOnce();
      }, 5000);
    } else {
      // Secondary pages have no loader. Skip the orange entry-reveal wipe:
      // GSAP loads late, so it used to paint the orange panel over already-
      // rendered content and read as a full-screen orange flash. Just park the
      // transition overlay hidden so the page content shows immediately.
      resetOverlay();
      bootOnce();
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
