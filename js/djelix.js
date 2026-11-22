/* KASPR: Seite, Himmel, Player, Formulare. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CFG = window.DJELIX || {};

  /* Himmel */
  const canvas = $('#himmel');
  let sky = null;
  if (!ruhig && window.Sky) { try { sky = Sky.create(canvas); } catch { sky = null; } }
  let qual = matchMedia('(max-width: 700px)').matches ? 0.8 : 0.72;
  const fit = () => { if (!sky) return; const dpr = Math.min(devicePixelRatio || 1, 2); const w = Math.min(innerWidth * dpr * qual, 1500); sky.resize(Math.round(w), Math.round(w * innerHeight / innerWidth)); };
  fit(); addEventListener('resize', fit, { passive: true });

  const zonen = $$('[data-from]');
  const offen = new Set();
  const sicht = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) offen.add(e.target); else offen.delete(e.target); } });
  $$('[data-open-sky]').forEach((el) => sicht.observe(el));
  const lerp = (a, b, t) => a + (b - a) * t;
  let stunde = 0, ziel = 0, vorschau = null, ersterFrame = true, schwenk = 0, zone = null;
  const nav = $('#nav');
  const TINTE = { dark: '#16090F', light: '#FAF4F1' };
  const liesZone = () => {
    const mitte = innerHeight * 0.5;
    for (const z of zonen) {
      const r = z.getBoundingClientRect();
      if (r.top <= mitte && r.bottom > mitte) {
        ziel = lerp(+z.dataset.from, +z.dataset.to, Math.min(1, Math.max(0, (mitte - r.top) / r.height)));
        if (z !== zone) {
          zone = z;
          nav.dataset.ink = z.dataset.ink;
          nav.style.setProperty('--nav-ink', TINTE[z.dataset.ink]);
          const g = getComputedStyle(z).getPropertyValue('--ground').trim();
          nav.style.setProperty('--nav-ground', z.id === 'termine' ? '#0A2647' : z.id === 'orte' || z.classList.contains('logos') ? '#0B090C' : z.classList.contains('fuss') ? '#FFB4C2' : g || '#F2541B');
        }
        break;
      }
    }
  };
  let letzteY = scrollY;
  const zeit0 = performance.now();
  const tick = (now) => {
    liesZone();
    const soll = vorschau !== null ? vorschau : ziel;
    stunde += (soll - stunde) * 0.1;
    if (Math.abs(soll - stunde) < 0.002) stunde = soll;
    if (sky && offen.size) {
      schwenk += ((vorschau !== null ? -0.17 : 0) - schwenk) * 0.08;
      sky.render(stunde, (now - zeit0) / 1000, { panY: schwenk });
      if (ersterFrame) { ersterFrame = false; sky.gl.finish(); requestAnimationFrame(() => html.classList.add('gl')); }
    }
    const y = scrollY;
    if (Math.abs(y - letzteY) > 6) {
      nav.classList.toggle('is-weg', y > letzteY && y > innerHeight * 0.4 && !nav.matches(':focus-within'));
      nav.classList.toggle('is-band', y > innerHeight * 0.4);
      letzteY = y;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  if (sky) {
    let n = 0, s = performance.now(), geprueft = 0;
    const mess = () => { n++; if (performance.now() - s > 1500) { const fps = n / ((performance.now() - s) / 1000); if (offen.size && fps < 40 && qual > 0.42 && geprueft < 4) { qual *= 0.78; fit(); geprueft++; } n = 0; s = performance.now(); } requestAnimationFrame(mess); };
    requestAnimationFrame(mess);
  }
  /* Jeder Buchstabe zeigt eine andere Stunde */
  $$('[data-vorschau]').forEach((a) => {
    a.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') vorschau = +a.dataset.vorschau; });
    a.addEventListener('pointerleave', () => { vorschau = null; });
    a.addEventListener('click', () => { vorschau = null; });
  });

  /* SoundCloud: lädt erst nach dem Klick, die Platte dreht, solange Musik läuft */
  const teller = $('#plattenteller'), jetzt = $('#jetzt-laeuft');
  let dreh = null;
  const spin = (an) => {
    if (!window.gsap || ruhig || !teller) return;
    if (an && !dreh) dreh = gsap.to(teller, { rotation: '+=360', duration: 1.8, ease: 'none', repeat: -1 });
    if (!an && dreh) { dreh.kill(); dreh = null; gsap.to(teller, { rotation: '+=40', duration: 1.2, ease: 'power2.out' }); }
  };
  const scKnopf = $('#sc-laden');
  if (CFG.soundcloud) $$('[data-sc-profil], #fuss-links a').forEach((a) => { if (a.href.includes('soundcloud')) a.href = CFG.soundcloud; });
  if (scKnopf) scKnopf.addEventListener('click', () => {
    const box = $('#sc'), karte = box.closest('.sc');
    const url = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(CFG.soundcloud || 'https://soundcloud.com/djelix1') + '&color=%23f2541b&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
    const f = document.createElement('iframe');
    f.src = url; f.title = 'DJ KASPR auf SoundCloud'; f.allow = 'autoplay'; f.loading = 'eager';
    box.replaceChildren(f); karte.classList.add('is-player');
    const s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = () => {
      const w = SC.Widget(f), E = SC.Widget.Events;
      const titel = () => w.getCurrentSound((t) => { if (t && jetzt) jetzt.textContent = t.title; });
      w.bind(E.PLAY, () => { spin(true); titel(); });
      w.bind(E.PAUSE, () => spin(false));
      w.bind(E.FINISH, () => spin(false));
    };
    document.head.append(s);
  });

  /* Termine: kommen aus JARVIS (über CFG.api), config.js ist nur Rückfall */
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const zeigeTermine = (liste) => {
    const kommend = (liste || []).map((t) => ({ ...t, d: new Date(t.datum + 'T12:00:00') })).filter((t) => !isNaN(t.d) && t.d >= heute).sort((a, b) => a.d - b.d);
    if (!kommend.length) return false;
    const t = kommend[0];
    const tag = $('[data-termin-tag]'), datum = $('[data-termin-datum]'), ort = $('[data-termin-ort]');
    tag.textContent = t.d.toLocaleDateString('de-AT', { weekday: 'long' }) + (t.d.getFullYear() !== heute.getFullYear() ? ' ' + t.d.getFullYear() : '');
    datum.textContent = t.d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
    datum.classList.remove('is-leer');
    ort.textContent = [t.ort, t.stadt].filter(Boolean).join(' · ');
    tag.hidden = false; ort.hidden = !ort.textContent;
    return true;
  };
  zeigeTermine(CFG.termine);
  if (CFG.api) fetch(CFG.api, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && Array.isArray(j.termine) && j.termine.length) zeigeTermine(j.termine); }).catch(() => {});

  /* Formulare: Anfrage und Liedwunsch landen in JARVIS, Anfragen zusätzlich per Mail */
  const sende = async (url, daten) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(daten) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) === 'false' || j.ok === false) throw new Error(j.error || j.message || r.status);
    return true;
  };
  $$('[data-formular]').forEach((form) => {
    const art = form.dataset.formular, knopf = form.querySelector('button[type=submit]'), status = form.querySelector('.status');
    const melde = (t, fehler) => { status.textContent = t; status.classList.toggle('is-fehler', !!fehler); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form._honey && form._honey.value) return;
      const daten = Object.fromEntries(new FormData(form));
      delete daten._honey;
      if (art === 'booking') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(daten.email || '')) { melde('Bitte eine gültige E-Mail eintragen.', true); form.email.focus(); return; }
      } else if (!(daten.song || '').trim()) { melde('Bitte einen Song eintragen.', true); form.song.focus(); return; }
      const wege = [];
      if (CFG.api) wege.push(sende(CFG.api, { art, ...daten }));
      if (art === 'booking' && CFG.formular) wege.push(sende(CFG.formular, { ...daten, _subject: 'Booking-Anfrage über die Website', _replyto: daten.email, _template: 'box' }));
      if (!wege.length) { melde('Das Formular ist noch nicht eingerichtet.', true); return; }
      knopf.disabled = true; melde('Wird gesendet …');
      const erg = await Promise.allSettled(wege);
      knopf.disabled = false;
      if (erg.some((x) => x.status === 'fulfilled')) {
        melde(art === 'booking' ? 'Danke. Die Anfrage ist angekommen, Antwort kommt per Mail.' : 'Danke, der Wunsch ist angekommen.');
        if (art === 'booking') form.email.value = ''; else form.song.value = '';
      } else {
        const zuViel = erg.some((x) => String(x.reason && x.reason.message).includes('Zu viele'));
        melde(zuViel ? 'Kurz durchatmen, gleich wieder probieren.' : 'Senden hat nicht geklappt. Bitte später noch einmal versuchen.', true);
      }
    });
  });

  /* Fenster für Impressum und Datenschutz */
  const auf = []; let z = 60;
  const handy = () => matchMedia('(max-width: 700px)').matches;
  const nachVorn = (w) => { w.style.zIndex = ++z; };
  const zeige = (id, von) => {
    const w = document.getElementById(id); if (!w) return;
    if (w.classList.contains('is-auf')) { nachVorn(w); return; }
    w.__von = von; w.classList.add('is-auf');
    const b = von.getBoundingClientRect();
    w.style.setProperty('--x', Math.min(innerWidth - w.offsetWidth - 16, Math.max(16, b.left)) + 'px');
    w.style.setProperty('--y', Math.max(72, b.top - w.offsetHeight - 16) + 'px');
    nachVorn(w); auf.push(w);
    if (window.gsap && !ruhig) gsap.fromTo(w, { clipPath: 'inset(0% 100% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'expo.out', clearProps: 'clipPath' });
    w.querySelector('.zu').focus({ preventScroll: true });
  };
  const schliesse = (w) => { w.classList.remove('is-auf'); const i = auf.indexOf(w); if (i > -1) auf.splice(i, 1); if (w.__von) w.__von.focus({ preventScroll: true }); };
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-open]'); if (t) { zeige(t.dataset.open, t); return; } const c = e.target.closest('.zu'); if (c) schliesse(c.closest('.schwebe')); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && auf.length) schliesse(auf[auf.length - 1]); });
  $$('.schwebe').forEach((w) => {
    w.addEventListener('pointerdown', () => nachVorn(w));
    const griff = $('[data-griff]', w);
    griff.addEventListener('pointerdown', (e) => {
      if (handy() || e.target.closest('.zu')) return;
      const r = w.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      griff.setPointerCapture(e.pointerId);
      const zieh = (m) => { w.style.setProperty('--x', Math.min(innerWidth - 80, Math.max(-r.width + 120, m.clientX - dx)) + 'px'); w.style.setProperty('--y', Math.min(innerHeight - 44, Math.max(0, m.clientY - dy)) + 'px'); };
      const los = () => { griff.removeEventListener('pointermove', zieh); griff.removeEventListener('pointerup', los); };
      griff.addEventListener('pointermove', zieh); griff.addEventListener('pointerup', los);
    });
  });

  /* Fenster und Texte treten auf */
  const wio = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-offen'); wio.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  const rio = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
  $$('[data-reveal]').forEach((el) => rio.observe(el));
  const zeilen = $$('[data-lines]');
  if (!ruhig) {
    const zurueck = (el) => { el.textContent = el.dataset.text; el.classList.remove('is-split', 'is-in'); };
    const teile = (el) => {
      const text = el.textContent.trim().replace(/\s+/g, ' '); el.dataset.text = text; el.textContent = '';
      const w = text.split(' ').map((t) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = t; el.append(s, ' '); return s; });
      const lines = []; for (const s of w) { const l = lines.at(-1); if (l && Math.abs(l.top - s.offsetTop) < 4) l.w.push(s.textContent); else lines.push({ top: s.offsetTop, w: [s.textContent] }); }
      el.textContent = '';
      lines.forEach((l, i) => { const m = document.createElement('span'), n = document.createElement('span'); m.className = 'line'; n.style.setProperty('--i', i); n.textContent = l.w.join(' '); m.append(n); el.append(m, ' '); });
      el.classList.add('is-split');
    };
    const lio = new IntersectionObserver((es) => { for (const e of es) { if (!e.isIntersecting) continue; lio.unobserve(e.target); e.target.classList.add('is-in'); const last = e.target.querySelector('.line:last-of-type > span'); if (last) last.addEventListener('transitionend', () => zurueck(e.target), { once: true }); } }, { rootMargin: '0px 0px -12% 0px' });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => zeilen.forEach((el) => { teile(el); lio.observe(el); }));
  }

  /* Clips laufen nur, wenn man sie sieht */
  const clipIO = new IntersectionObserver((es) => { for (const e of es) { if (ruhig) continue; if (e.isIntersecting) { e.target.preload = 'auto'; e.target.play().catch(() => {}); } else e.target.pause(); } }, { threshold: 0.2 });
  $$('video[data-clip]').forEach((v) => clipIO.observe(v));

  /* Szenen */
  const S = window.Scenes = window.Scenes || {};
  S.hero = (root) => Stage.scene(root, {
    hold: 0.5, phone: { hold: 0.45 },
    build(tl, { q }) {
      tl.to(q('.hero__copy')[0], { yPercent: 14, autoAlpha: 0, duration: 0.12 }, 0);
      tl.to(q('.wall')[0], { scale: 22, ease: 'power3.in', duration: 0.55 }, 0.02);
      tl.set(q('.wall')[0], { autoAlpha: 0 }, 0.58);
      /* der Sonnenuntergang wird vom Blau des nächsten Kapitels weggezogen */
      tl.fromTo(q('.hero__vorhang')[0], { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 1 }, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, ease: 'power2.inOut', duration: 0.42 }, 0.56);
    },
  });
  S.strecke = (root) => Stage.scene(root, {
    hold: 3.2, phone: 'rest',
    build(tl, { q }) {
      const bahn = q('.strecke__bahn')[0];
      tl.to(bahn, { x: () => -(bahn.scrollWidth - innerWidth), duration: 0.96, ease: 'none' }, 0.02);
      q('.strecke__bild img').forEach((img) => tl.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 0.96, ease: 'none' }, 0.02));
    },
  });
  if (window.Stage) { Stage.smooth({ lerp: 0.12 }); Stage.init(); }
  $$('[data-win]').forEach((w) => wio.observe(w));

  if (window.gsap && window.ScrollTrigger && !ruhig) {
    gsap.registerPlugin(ScrollTrigger);
    const fw = $('.fuss__wand');
    if (fw) gsap.fromTo(fw, { yPercent: 6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.fuss', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.logos__reihe li', { autoAlpha: 0, y: 24, duration: 0.8, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.logos', start: 'top 80%', once: true } });
    if (Stage.lenis) $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const el = $(a.getAttribute('href')); if (el) { e.preventDefault(); Stage.lenis.scrollTo(el, { offset: 0, duration: 1.4 }); } }));
  }
})();
