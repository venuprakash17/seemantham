(() => {
  const TOTAL = 47;
  const HOLD_MS = 6800;
  const TRANSITION_MS = 1650;
  const MUSIC_VOLUME = 0.4;
  const PRELOAD_AHEAD = 5;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORAGE_KEY = 'lavanya-cinema-prefs-v1';

  const TRANSITIONS = reduceMotion
    ? ['tx-dissolve']
    : ['tx-ink', 'tx-dissolve', 'tx-wipe', 'tx-zoom', 'tx-ripple', 'tx-diagonal'];

  const cinema = document.getElementById('cinema');
  const slideA = document.getElementById('slideA');
  const slideB = document.getElementById('slideB');
  const inkVeil = document.getElementById('inkVeil');
  const flashFrame = document.getElementById('flashFrame');
  const inkCanvas = document.getElementById('inkCanvas');
  const intro = document.getElementById('intro');
  const endcard = document.getElementById('endcard');
  const hud = document.getElementById('hud');
  const slideLabel = document.getElementById('slideLabel');
  const timelineBar = document.getElementById('timelineBar');
  const startBtn = document.getElementById('startBtn');
  const replayBtn = document.getElementById('replayBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const musicBtn = document.getElementById('musicBtn');
  const musicToggleIntro = document.getElementById('musicToggleIntro');
  const fsBtn = document.getElementById('fsBtn');
  const themeMusic = document.getElementById('themeMusic');

  const layers = [slideA, slideB];
  let activeLayer = 0;
  let index = 0;
  let playing = false;
  let transitioning = false;
  let holdTimer = null;
  let progressRaf = 0;
  let holdStartedAt = 0;
  let holdRemaining = HOLD_MS;
  let musicOn = true;
  let hudIdleTimer = null;
  let inkDrops = [];
  let sparks = [];
  let txCursor = 0;
  let kenRaf = 0;
  let kenState = null;

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }
  function savePrefs(patch) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
    } catch (_) {}
  }

  musicOn = loadPrefs().music !== false;

  function pageSrc(n) {
    return `assets/pages/page-${String(n).padStart(2, '0')}.jpg`;
  }

  function preload(n) {
    if (n < 1 || n > TOTAL) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = pageSrc(n);
  }

  function preloadAround(n) {
    for (let i = 0; i <= PRELOAD_AHEAD; i += 1) preload(n + i);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function setMusicUi() {
    document.body.classList.toggle('music-muted', !musicOn);
    musicBtn.setAttribute('aria-label', musicOn ? 'Mute music' : 'Unmute music');
    musicToggleIntro.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    musicToggleIntro.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;
  }

  function startMusic() {
    if (!themeMusic || !musicOn) return;
    themeMusic.volume = MUSIC_VOLUME;
    themeMusic.play().catch(() => {});
  }

  function pauseMusic() {
    themeMusic?.pause();
  }

  function updateLabel() {
    slideLabel.textContent = `${index + 1} / ${TOTAL}`;
  }

  function getImg(layer) {
    return layer.querySelector('img');
  }

  function clearTxClasses(layer) {
    TRANSITIONS.forEach((name) => layer.classList.remove(name));
    layer.classList.remove('entering', 'leaving', 'active');
  }

  function nextTransition() {
    const name = TRANSITIONS[txCursor % TRANSITIONS.length];
    txCursor += 1;
    return name;
  }

  // ---------- Ultra-smooth JS Ken Burns ----------
  function stopKen() {
    cancelAnimationFrame(kenRaf);
    kenRaf = 0;
  }

  function startKen(img, variant) {
    stopKen();
    if (reduceMotion || !img) return;

    // Gentle motion so the full original page stays visible (no heavy crop).
    const isNarrow = window.matchMedia('(max-width: 720px), (max-height: 520px)').matches;
    const patterns = isNarrow
      ? [
          { sx: 1.0, sy: 1.035, x0: -0.35, y0: 0.2, x1: 0.4, y1: -0.25 },
          { sx: 1.02, sy: 1.0, x0: 0.4, y0: -0.25, x1: -0.3, y1: 0.3 },
          { sx: 1.0, sy: 1.04, x0: 0.1, y0: -0.35, x1: -0.15, y1: 0.35 },
          { sx: 1.03, sy: 1.0, x0: -0.4, y0: 0.15, x1: 0.35, y1: -0.2 },
          { sx: 1.0, sy: 1.03, x0: 0.25, y0: 0.3, x1: -0.25, y1: -0.25 }
        ]
      : [
          { sx: 1.0, sy: 1.05, x0: -0.6, y0: 0.35, x1: 0.7, y1: -0.45 },
          { sx: 1.04, sy: 1.0, x0: 0.65, y0: -0.4, x1: -0.55, y1: 0.5 },
          { sx: 1.0, sy: 1.055, x0: 0.15, y0: -0.55, x1: -0.2, y1: 0.6 },
          { sx: 1.045, sy: 1.0, x0: -0.7, y0: 0.2, x1: 0.55, y1: -0.3 },
          { sx: 1.0, sy: 1.045, x0: 0.45, y0: 0.5, x1: -0.45, y1: -0.4 }
        ];
    const p = patterns[variant % patterns.length];
    kenState = {
      img,
      p,
      start: performance.now(),
      duration: HOLD_MS + TRANSITION_MS * 0.35,
      pausedAt: 0,
      elapsedPaused: 0,
      running: true
    };

    const tick = (now) => {
      if (!kenState || !kenState.running) return;
      const tRaw = Math.min(1, (now - kenState.start - kenState.elapsedPaused) / kenState.duration);
      const t = easeInOutCubic(tRaw);
      const scale = p.sx + (p.sy - p.sx) * t;
      const x = p.x0 + (p.x1 - p.x0) * t;
      const y = p.y0 + (p.y1 - p.y0) * t;
      kenState.img.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale})`;
      if (tRaw < 1) kenRaf = requestAnimationFrame(tick);
    };
    kenRaf = requestAnimationFrame(tick);
  }

  function pauseKen() {
    if (!kenState || !kenState.running) return;
    kenState.running = false;
    kenState.pausedAt = performance.now();
    stopKen();
  }

  function resumeKen() {
    if (!kenState || kenState.running) return;
    kenState.elapsedPaused += performance.now() - kenState.pausedAt;
    kenState.running = true;
    const tick = (now) => {
      if (!kenState || !kenState.running) return;
      const tRaw = Math.min(1, (now - kenState.start - kenState.elapsedPaused) / kenState.duration);
      const t = easeInOutCubic(tRaw);
      const { p, img } = kenState;
      const scale = p.sx + (p.sy - p.sx) * t;
      const x = p.x0 + (p.x1 - p.x0) * t;
      const y = p.y0 + (p.y1 - p.y0) * t;
      img.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale})`;
      if (tRaw < 1) kenRaf = requestAnimationFrame(tick);
    };
    kenRaf = requestAnimationFrame(tick);
  }

  function paintLayer(layer, pageNumber) {
    const img = getImg(layer);
    img.src = pageSrc(pageNumber);
    img.alt = `Lavanya's Seemantham page ${pageNumber}`;
    img.style.transform = 'translate3d(0,0,0) scale(1)';
  }

  // ---------- Particles ----------
  const ctx = inkCanvas.getContext('2d', { alpha: true });
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    inkCanvas.width = Math.floor(window.innerWidth * dpr);
    inkCanvas.height = Math.floor(window.innerHeight * dpr);
    inkCanvas.style.width = `${window.innerWidth}px`;
    inkCanvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnInkBurst(intensity = 1) {
    if (reduceMotion) return;
    const count = Math.floor(28 * intensity);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 4.2 * intensity;
      inkDrops.push({
        x: window.innerWidth * (0.32 + Math.random() * 0.36),
        y: window.innerHeight * (0.32 + Math.random() * 0.36),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        r: 2 + Math.random() * 14 * intensity,
        life: 1,
        decay: 0.01 + Math.random() * 0.018,
        gold: Math.random() > 0.4
      });
    }
    for (let i = 0; i < 22 * intensity; i += 1) {
      sparks.push({
        x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.48 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 1,
        r: 0.6 + Math.random() * 1.8,
        life: 1,
        decay: 0.016 + Math.random() * 0.02
      });
    }
  }

  function spawnAmbient() {
    if (reduceMotion || !playing) return;
    if (inkDrops.length < 50 && Math.random() > 0.82) {
      inkDrops.push({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 12,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.4 - Math.random() * 0.75,
        r: 1 + Math.random() * 3.5,
        life: 1,
        decay: 0.0035 + Math.random() * 0.005,
        gold: Math.random() > 0.45
      });
    }
    if (sparks.length < 40 && Math.random() > 0.88) {
      sparks.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        r: 0.5 + Math.random(),
        life: 1,
        decay: 0.008 + Math.random() * 0.01
      });
    }
  }

  function tickFx() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    spawnAmbient();

    inkDrops = inkDrops.filter((d) => d.life > 0.02);
    for (const d of inkDrops) {
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.012;
      d.vx *= 0.995;
      d.life -= d.decay;
      const a = Math.max(0, d.life) * 0.78;
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      if (d.gold) {
        g.addColorStop(0, `rgba(255, 236, 190, ${a})`);
        g.addColorStop(0.4, `rgba(210, 164, 96, ${a * 0.55})`);
        g.addColorStop(1, 'rgba(120, 70, 30, 0)');
      } else {
        g.addColorStop(0, `rgba(90, 45, 28, ${a})`);
        g.addColorStop(0.5, `rgba(40, 18, 10, ${a * 0.45})`);
        g.addColorStop(1, 'rgba(8, 4, 2, 0)');
      }
      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(d.x, d.y, d.r * (1.15 - d.life * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }

    sparks = sparks.filter((s) => s.life > 0.02);
    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;
      const a = Math.max(0, s.life);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 230, 180, ${a})`;
      ctx.shadowColor = `rgba(227, 198, 147, ${a})`;
      ctx.shadowBlur = 8;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(tickFx);
  }

  function showHud() {
    hud.classList.remove('idle');
    clearTimeout(hudIdleTimer);
    if (playing) hudIdleTimer = setTimeout(() => hud.classList.add('idle'), 2600);
  }

  function clearHold() {
    clearTimeout(holdTimer);
    cancelAnimationFrame(progressRaf);
    holdTimer = null;
    progressRaf = 0;
  }

  function runProgress(duration, fromPct, toPct) {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      timelineBar.style.width = `${fromPct + (toPct - fromPct) * t}%`;
      if (t < 1 && playing) progressRaf = requestAnimationFrame(tick);
    };
    progressRaf = requestAnimationFrame(tick);
  }

  function startHold() {
    clearHold();
    holdStartedAt = performance.now();
    holdRemaining = HOLD_MS;
    const fromPct = (index / TOTAL) * 100;
    const toPct = ((index + 1) / TOTAL) * 100;
    runProgress(HOLD_MS, fromPct, toPct);
    holdTimer = setTimeout(() => {
      if (!playing || transitioning) return;
      if (index >= TOTAL - 1) finishFilm();
      else goTo(index + 1, 1);
    }, HOLD_MS);
  }

  function pauseHold() {
    if (!holdTimer) return;
    const elapsed = performance.now() - holdStartedAt;
    holdRemaining = Math.max(500, HOLD_MS - elapsed);
    clearHold();
  }

  function resumeHold() {
    clearHold();
    holdStartedAt = performance.now();
    const remaining = holdRemaining;
    const fromPct = parseFloat(timelineBar.style.width) || (index / TOTAL) * 100;
    const toPct = ((index + 1) / TOTAL) * 100;
    runProgress(remaining, fromPct, toPct);
    holdTimer = setTimeout(() => {
      if (!playing || transitioning) return;
      if (index >= TOTAL - 1) finishFilm();
      else goTo(index + 1, 1);
    }, remaining);
  }

  function flashEffects(txName) {
    inkVeil.classList.remove('flash');
    flashFrame.classList.remove('pulse');
    void inkVeil.offsetWidth;
    inkVeil.classList.add('flash');
    flashFrame.classList.add('pulse');
    const intensity = txName === 'tx-zoom' || txName === 'tx-ink' ? 1.35 : 1;
    spawnInkBurst(intensity);
  }

  function goTo(nextIndex) {
    if (transitioning) return;
    nextIndex = Math.max(0, Math.min(TOTAL - 1, nextIndex));
    if (nextIndex === index && layers[activeLayer].classList.contains('active')) {
      updateLabel();
      return;
    }

    transitioning = true;
    clearHold();
    stopKen();

    const tx = nextTransition();
    const outgoing = layers[activeLayer];
    activeLayer = 1 - activeLayer;
    const incoming = layers[activeLayer];

    paintLayer(incoming, nextIndex + 1);
    preloadAround(nextIndex + 1);

    clearTxClasses(outgoing);
    clearTxClasses(incoming);
    outgoing.classList.add(tx, 'leaving');
    incoming.classList.add(tx, 'entering', 'active');

    flashEffects(tx);
    index = nextIndex;
    updateLabel();

    setTimeout(() => {
      outgoing.classList.remove(tx, 'leaving', 'entering', 'active');
      incoming.classList.remove('entering');
      incoming.classList.add('active');
      startKen(getImg(incoming), index);
      transitioning = false;
      if (playing) startHold();
    }, reduceMotion ? 50 : TRANSITION_MS);
  }

  function finishFilm() {
    playing = false;
    document.body.classList.remove('playing');
    document.body.classList.add('is-paused');
    clearHold();
    stopKen();
    hud.hidden = true;
    endcard.hidden = false;
    spawnInkBurst(1.6);
  }

  function beginFilm(from = 0) {
    intro.classList.add('hidden');
    endcard.hidden = true;
    hud.hidden = false;
    document.body.classList.add('playing');
    document.body.classList.remove('is-paused');
    playing = true;
    index = from;
    activeLayer = 0;
    txCursor = 0;

    layers.forEach(clearTxClasses);
    paintLayer(layers[0], from + 1);
    layers[0].classList.add('tx-ink', 'entering', 'active');
    preloadAround(from + 1);
    updateLabel();
    timelineBar.style.width = '0%';
    spawnInkBurst(1.5);
    flashEffects('tx-ink');
    startMusic();
    showHud();

    setTimeout(() => {
      layers[0].classList.remove('entering', 'tx-ink');
      layers[0].classList.add('active');
      startKen(getImg(layers[0]), from);
      if (playing) startHold();
    }, reduceMotion ? 40 : 1000);
  }

  function togglePlay() {
    if (!endcard.hidden) {
      beginFilm(0);
      return;
    }
    if (!intro.classList.contains('hidden')) return;

    if (playing) {
      playing = false;
      document.body.classList.add('is-paused');
      document.body.classList.remove('playing');
      pauseHold();
      pauseKen();
      showHud();
      hud.classList.remove('idle');
    } else {
      playing = true;
      document.body.classList.remove('is-paused');
      document.body.classList.add('playing');
      startMusic();
      resumeKen();
      resumeHold();
      showHud();
    }
  }

  function toggleMusic() {
    musicOn = !musicOn;
    savePrefs({ music: musicOn });
    setMusicUi();
    if (musicOn) startMusic();
    else pauseMusic();
  }

  startBtn.addEventListener('click', () => beginFilm(0));
  replayBtn.addEventListener('click', () => beginFilm(0));
  playPauseBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', () => {
    showHud();
    clearHold();
    goTo(index - 1);
  });
  nextBtn.addEventListener('click', () => {
    showHud();
    clearHold();
    if (index >= TOTAL - 1) finishFilm();
    else goTo(index + 1);
  });
  musicBtn.addEventListener('click', toggleMusic);
  musicToggleIntro.addEventListener('click', toggleMusic);
  fsBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await cinema.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {}
  });

  cinema.addEventListener('pointermove', showHud);
  cinema.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.hud, .intro, .endcard, button, a')) return;
    if (intro.classList.contains('hidden') && endcard.hidden) togglePlay();
  });

  document.addEventListener('keydown', (event) => {
    if (!intro.classList.contains('hidden')) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        beginFilm(0);
      }
      return;
    }
    if (event.key === ' ' || event.key === 'k') {
      event.preventDefault();
      togglePlay();
    }
    if (event.key === 'ArrowRight') {
      clearHold();
      if (index >= TOTAL - 1) finishFilm();
      else goTo(index + 1);
    }
    if (event.key === 'ArrowLeft') {
      clearHold();
      goTo(index - 1);
    }
    if (event.key.toLowerCase() === 'm') toggleMusic();
    if (event.key === 'f') fsBtn.click();
    if (event.key === 'Escape' && !document.fullscreenElement) {
      window.location.href = 'index.html';
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (playing) {
        playing = false;
        document.body.classList.add('is-paused');
        document.body.classList.remove('playing');
        pauseHold();
        pauseKen();
      }
      pauseMusic();
    } else if (musicOn && !document.body.classList.contains('is-paused') && intro.classList.contains('hidden')) {
      startMusic();
    }
  });

  window.addEventListener('resize', resizeCanvas);

  setMusicUi();
  if (themeMusic) themeMusic.volume = MUSIC_VOLUME;
  resizeCanvas();
  tickFx();
  preload(1);
  preload(2);
  preload(3);
  preload(4);
  paintLayer(slideA, 1);
})();
