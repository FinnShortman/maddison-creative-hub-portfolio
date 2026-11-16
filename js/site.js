/* UC Creative Hub · scroll choreography.
   Every scrubbed section records the scroll positions worth stopping at (`stops`),
   so the arrow keys, Page Down, space or a presentation clicker step through the talk. */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduced) { root.classList.remove('js'); return; }

  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const narrow = () => window.innerWidth <= 900;

  /* smooth scroll, driven by GSAP's clock so scrubbing stays in step */
  const lenis = window.Lenis ? new Lenis({ duration: 1.15, smoothWheel: true }) : null;
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const stopSources = []; // [{ st: ScrollTrigger, fractions: [0..1] }]

  /* ---------- chrome: progress bar and the page number ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  const pageNum = $('.page-num');
  // the cover's blue shape sits where the UC mark goes, so the mark arrives with page 02
  gsap.fromTo('.uc-fixed', { autoAlpha: 0 }, { autoAlpha: 1, duration: .5, scrollTrigger: { trigger: '.brief', start: 'top 80%', toggleActions: 'play none none reverse' } });
  $$('main > section').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) pageNum.textContent = sec.dataset.page || ''; }
    });
  });

  /* ---------- cover: the circle opens into the reception ---------- */
  (function hero() {
    const sec = $('.hero'), stage = $('.hero-stage'), photo = $('.hero-photo'), img = $('.hero-photo img');
    const geo = {}, state = { t: 0 };
    const measure = () => {
      const w = window.innerWidth, h = window.innerHeight;
      geo.r0 = narrow() ? Math.max(w, h) * 0.24 : Math.min(h * 0.36, w * 0.22, 380);
      geo.r1 = Math.hypot(w, h) * 0.6;
      geo.cx0 = narrow() ? 62 : 74; geo.cy0 = narrow() ? 27 : 50;
    };
    // the photo and its white ring both read --r, --cx and --cy off the stage
    const paint = t => {
      const e = gsap.parseEase('power2.inOut')(t);
      stage.style.setProperty('--r', lerp(geo.r0, geo.r1, e) + 'px');
      stage.style.setProperty('--cx', lerp(geo.cx0, 50, e) + '%');
      stage.style.setProperty('--cy', lerp(geo.cy0, 50, e) + '%');
    };
    measure(); paint(0);
    ScrollTrigger.addEventListener('refreshInit', () => { measure(); paint(state.t); });

    // entrance
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from([photo, '.hero-ring'], { opacity: 0, scale: .86, transformOrigin: `${geo.cx0}% ${geo.cy0}%`, duration: 1.4 })
      .from('.hero-arc', { xPercent: 18, opacity: 0, duration: 1.4 }, 0)
      .from('.plaque-main', { xPercent: -30, opacity: 0, duration: 1 }, .25)
      .from('.plaque-sub', { xPercent: -40, opacity: 0, duration: 1 }, .4)
      .from('.pillars li', { y: 24, opacity: 0, stagger: .1, duration: .8 }, .6)
      .from('.rule, .byline', { opacity: 0, duration: .8, stagger: .1 }, .9);

    const tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1 }
    });
    tl.to(state, { t: 1, duration: 1, ease: 'none', onUpdate: () => paint(state.t) }, 0)
      .to(img, { scale: 1, duration: 1, ease: 'none' }, 0)
      .to('.hero-copy', { x: -120, opacity: 0, duration: .45, ease: 'power1.in' }, 0)
      .to('.hero-arc', { scale: 1.5, opacity: 0, duration: .7 }, 0)
      .to('.hero-ring', { opacity: 0, duration: .35 }, .2)
      .to('.scroll-cue', { opacity: 0, duration: .15 }, 0)
      .to(photo, { '--shade': 1, duration: .4 }, 1)
      .fromTo('.hero-end', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .4 }, 1.05)
      .to({}, { duration: .35 });
    stopSources.push({ st: tl.scrollTrigger, fractions: [0, 1.45 / tl.duration()] });
  })();

  /* ---------- reveals and counters ---------- */
  ScrollTrigger.batch('.reveal', {
    start: 'top 86%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .12, overwrite: true })
  });
  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const dp = (el.dataset.count.split('.')[1] || '').length;
    const o = { v: 0 };
    el.textContent = (0).toFixed(dp);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = o.v.toFixed(dp); } })
    });
  });

  /* ---------- overall plan draws on, left to right ---------- */
  gsap.fromTo('.draw-on', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)', ease: 'none',
    scrollTrigger: { trigger: '.overall-frame', start: 'top 85%', end: 'center 55%', scrub: 1 }
  });
  gsap.from('.overall-frame', { scale: .92, ease: 'none', scrollTrigger: { trigger: '.overall-frame', start: 'top bottom', end: 'center 55%', scrub: 1 } });

  /* ---------- plan tours: a camera moves room to room ---------- */
  $$('.tour').forEach(sec => {
    const frame = $('.tour-frame', sec), cam = $('.cam', sec), img = $('img', cam);
    const rooms = $$('.rooms li', sec);
    const geo = {};
    const layout = () => {
      const ar = img.naturalWidth / img.naturalHeight || 1.6;
      geo.fw = frame.clientWidth; geo.fh = frame.clientHeight;
      geo.W = Math.min(geo.fw * .94, geo.fh * .94 * ar); geo.H = geo.W / ar;
      cam.style.width = geo.W + 'px'; cam.style.height = geo.H + 'px';
    };
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const at = (px, py, s) => ({
      x: () => geo.W * s <= geo.fw ? (geo.fw - geo.W * s) / 2 : clamp(geo.fw / 2 - px * geo.W * s, geo.fw - geo.W * s, 0),
      y: () => geo.H * s <= geo.fh ? (geo.fh - geo.H * s) / 2 : clamp(geo.fh / 2 - py * geo.H * s, geo.fh - geo.H * s, 0),
      scale: s
    });
    const build = () => {
      layout();
      const tl = gsap.timeline({
        defaults: { duration: 1, ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
          onRefreshInit: layout,
          onUpdate: self => {
            const t = self.progress * tl.duration();
            let on = -1;
            holds.forEach((h, i) => { if (t >= h - .75) on = i; });
            if (t > end - .5) on = -1;
            rooms.forEach((li, i) => li.classList.toggle('on', i === on));
          }
        }
      });
      const holds = [];
      tl.set(cam, at(.5, .5, 1));
      tl.to({}, { duration: .4 });
      rooms.forEach(li => {
        tl.to(cam, at(+li.dataset.x, +li.dataset.y, +li.dataset.s));
        holds.push(tl.duration() + .4);
        tl.to({}, { duration: .8 });
      });
      tl.to(cam, at(.5, .5, 1));
      const end = tl.duration();
      tl.to({}, { duration: .4 });
      stopSources.push({ st: tl.scrollTrigger, fractions: [0, ...holds.map(h => h / tl.duration()), end / tl.duration()] });
    };
    if (img.complete && img.naturalWidth) build(); else img.addEventListener('load', () => { build(); ScrollTrigger.refresh(); }, { once: true });
  });

  /* ---------- line drawing to rendered finish ---------- */
  $$('.wipe-pin').forEach(pin => {
    const figs = $$('.wipe', pin);
    const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 1 } });
    // one elevation at a time, in the same place: wipe it, then hand over to the next
    gsap.set(figs.slice(1), { opacity: 0 });
    tl.from(figs[0], { opacity: 0, y: 50, duration: .5, ease: 'power2.out' });
    const marks = [0];
    figs.forEach((f, i) => {
      if (i > 0) {
        tl.to(figs[i - 1], { opacity: 0, y: -30, duration: .4 });
        tl.fromTo(f, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .4 }, '<.1');
      }
      tl.to(f, { '--p': '100%', duration: 1.2, ease: 'power1.inOut' });
      tl.to(f, { '--scan': 0, duration: .2 });
      tl.to({}, { duration: .3 });
      marks.push(tl.duration());
    });
    tl.to({}, { duration: .4 });
    stopSources.push({ st: tl.scrollTrigger, fractions: marks.map(m => m / tl.duration()) });
  });

  /* ---------- quiet parallax on drawings and renders ---------- */
  gsap.fromTo('.parallax', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.parallax-frame', scrub: true } });
  $$('.parallax-in').forEach(img => {
    gsap.fromTo(img, { scale: 1.18, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true } });
  });

  /* ---------- ceilings: workplace RCP crossfades to student services ---------- */
  (function rcp() {
    const pin = $('.rcp-pin'), spans = $$('.rcp-switch span');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 1,
        onUpdate: self => { const b = self.progress > .5; spans[0].classList.toggle('on', !b); spans[1].classList.toggle('on', b); }
      }
    });
    tl.from('.rcp-a', { scale: .94, opacity: 0, duration: .5 })
      .to({}, { duration: .6 })
      .to('.rcp-a', { opacity: 0, duration: .4 })
      .to('.rcp-b', { opacity: 1, duration: .4 }, '<')
      .to({}, { duration: .6 });
    stopSources.push({ st: tl.scrollTrigger, fractions: [.3, .85] });
  })();

  /* ---------- material swatches ---------- */
  ScrollTrigger.batch('.sw', {
    start: 'top 90%',
    onEnter: els => gsap.from(els, { y: 70, rotate: 3, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08 })
  });

  /* ---------- gallery runs sideways ---------- */
  (function gallery() {
    const sec = $('.gallery'), track = $('.track');
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } });
    tl.to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: 'none', duration: 1 });
    $$('.slide img', track).forEach(im => gsap.fromTo(im, { scale: 1.1 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true }
    }));
    const n = $$('.slide', track).length;
    stopSources.push({ st: tl.scrollTrigger, fractions: Array.from({ length: n }, (_, i) => i / (n - 1)) });
  })();

  /* ---------- presenting: step to the next stop with a key or clicker ---------- */
  let stops = [];
  const collect = () => {
    const pts = $$('main > section').map(s => s.getBoundingClientRect().top + window.scrollY);
    stopSources.forEach(({ st, fractions }) => fractions.forEach(f => pts.push(st.start + f * (st.end - st.start))));
    // a section top inside a pinned run duplicates its first stop
    stops = Array.from(new Set(pts.map(Math.round))).sort((a, b) => a - b)
      .filter((v, i, arr) => i === 0 || v - arr[i - 1] > 40);
  };
  ScrollTrigger.addEventListener('refresh', collect);
  const go = dir => {
    const y = window.scrollY;
    const target = dir > 0 ? stops.find(s => s > y + 8) : [...stops].reverse().find(s => s < y - 8);
    if (target === undefined) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: target, behavior: 'smooth' });
  };
  window.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea')) return;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key) && !e.shiftKey) { e.preventDefault(); go(1); }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); lenis ? lenis.scrollTo(0) : window.scrollTo(0, 0); }
  });
  $('.mark').addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo(0, 0); });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
