(() => {
  const TOTAL_PAGES = 47;
  const PAGE_WIDTH = 792;
  const PAGE_HEIGHT = 612;
  const PRELOAD_PHOTOS = Math.min(10, TOTAL_PAGES);
  const STORAGE_KEY = 'lavanya-album-prefs-v2';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SLIDESHOW_MS = 5200;
  const SLIDESHOW_FLIP_MS = reduceMotion ? 220 : 1450;
  const NORMAL_FLIP_MS = reduceMotion ? 180 : 1050;
  const MUSIC_VOLUME = 0.4;
  const MUSIC_SRC = 'assets/audio/seemantham-theme.mp3';

  const bookEl = document.getElementById('book');
  const currentPageEl = document.getElementById('currentPage');
  const totalPagesEl = document.getElementById('totalPages');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const thumbsBtn = document.getElementById('thumbsBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const shareBtn = document.getElementById('shareBtn');
  const slideshowBtn = document.getElementById('slideshowBtn');
  const pageCounter = document.getElementById('pageCounter');
  const thumbPanel = document.getElementById('thumbPanel');
  const thumbGrid = document.getElementById('thumbGrid');
  const closeThumbsBtn = document.getElementById('closeThumbsBtn');
  const scrim = document.getElementById('scrim');
  const jumpForm = document.getElementById('jumpForm');
  const jumpInput = document.getElementById('jumpInput');
  const zoomBtn = document.getElementById('zoomBtn');
  const zoomViewer = document.getElementById('zoomViewer');
  const zoomCanvas = document.getElementById('zoomCanvas');
  const zoomImage = document.getElementById('zoomImage');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomCloseBtn = document.getElementById('zoomCloseBtn');
  const zoomPrevBtn = document.getElementById('zoomPrevBtn');
  const zoomNextBtn = document.getElementById('zoomNextBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const openingScreen = document.getElementById('openingScreen');
  const openAlbumBtn = document.getElementById('openAlbumBtn');
  const resumeAlbumBtn = document.getElementById('resumeAlbumBtn');
  const resumePageLabel = document.getElementById('resumePageLabel');
  const loadingPercent = document.getElementById('loadingPercent');
  const loadingBar = document.getElementById('loadingBar');
  const loadingLabel = document.getElementById('loadingLabel');
  const loadingSteps = document.getElementById('loadingSteps');
  const soundBtn = document.getElementById('soundBtn');
  const soundToggleIntro = document.getElementById('soundToggleIntro');
  const readingBar = document.getElementById('readingBar');
  const toastEl = document.getElementById('toast');
  const hintText = document.getElementById('hintText');
  const themeMusic = document.getElementById('themeMusic');
  const slideshowBanner = document.getElementById('slideshowBanner');
  const slideshowStatus = document.getElementById('slideshowStatus');
  const slideshowStopBtn = document.getElementById('slideshowStopBtn');

  totalPagesEl.textContent = String(TOTAL_PAGES);
  jumpInput.max = String(TOTAL_PAGES);
  jumpInput.placeholder = `1–${TOTAL_PAGES}`;

  let pageFlip = null;
  let zoomPageNumber = 1;
  let slideshowTimer = null;
  let slideshowActive = false;
  let toastTimer = null;
  let pendingStartPage = 0;
  let albumOpened = false;
  let loadingStepTimer = null;

  function pageSrc(pageNumber) {
    return `assets/pages/page-${String(pageNumber).padStart(2, '0')}.jpg`;
  }

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function savePrefs(patch) {
    try {
      const next = { ...loadPrefs(), ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    } catch (_) {
      return patch;
    }
  }

  const prefs = loadPrefs();
  let audioEnabled = prefs.sound !== false;

  function parsePageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = Number(params.get('page'));
    if (Number.isFinite(fromQuery) && fromQuery >= 1 && fromQuery <= TOTAL_PAGES) {
      return Math.floor(fromQuery) - 1;
    }
    const hash = window.location.hash.replace('#', '');
    const fromHash = Number(hash);
    if (Number.isFinite(fromHash) && fromHash >= 1 && fromHash <= TOTAL_PAGES) {
      return Math.floor(fromHash) - 1;
    }
    return null;
  }

  function syncUrl(pageNumber, replace = true) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(pageNumber));
    url.hash = '';
    history[replace ? 'replaceState' : 'pushState']({ page: pageNumber }, '', url);
  }

  function showToast(message) {
    toastEl.hidden = false;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastEl.hidden = true;
    }, 2200);
  }

  function setBodyModalState() {
    document.body.classList.toggle(
      'modal-open',
      zoomViewer.classList.contains('open') ||
        thumbPanel.classList.contains('open') ||
        !openingScreen.classList.contains('hidden')
    );
  }

  function buildPages() {
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= TOTAL_PAGES; i += 1) {
      const page = document.createElement('div');
      const isCover = i === 1 || i === TOTAL_PAGES;
      page.className = `page${isCover ? ' page-cover' : ''}`;
      page.dataset.density = isCover ? 'hard' : 'soft';
      page.dataset.pageNumber = String(i);
      page.setAttribute('role', 'img');
      page.setAttribute('aria-label', `Lavanya's Seemantham album page ${i}`);

      const image = document.createElement('img');
      image.src = pageSrc(i);
      image.alt = `Lavanya's Seemantham album page ${i}`;
      image.draggable = false;
      image.loading = i <= 8 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.width = 1320;
      image.height = 1020;
      page.appendChild(image);
      fragment.appendChild(page);
    }
    bookEl.appendChild(fragment);
  }

  function buildThumbnails() {
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= TOTAL_PAGES; i += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.dataset.page = String(i - 1);
      button.dataset.label = String(i);
      button.setAttribute('aria-label', `Go to album page ${i}`);

      const image = document.createElement('img');
      image.src = pageSrc(i);
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      button.appendChild(image);

      button.addEventListener('click', () => {
        playSoftClick();
        goToPageIndex(Number(button.dataset.page));
        closeThumbnails();
      });
      fragment.appendChild(button);
    }
    thumbGrid.appendChild(fragment);
  }

  function openThumbnails() {
    stopSlideshow();
    playSoftClick();
    thumbPanel.classList.add('open');
    thumbPanel.setAttribute('aria-hidden', 'false');
    scrim.hidden = false;
    jumpInput.value = String((pageFlip?.getCurrentPageIndex?.() ?? 0) + 1);
    setBodyModalState();
    setTimeout(() => jumpInput.focus(), 180);
  }

  function closeThumbnails() {
    thumbPanel.classList.remove('open');
    thumbPanel.setAttribute('aria-hidden', 'true');
    scrim.hidden = true;
    setBodyModalState();
  }

  function setActiveThumbnail(pageIndex) {
    document.querySelectorAll('.thumb.active').forEach((el) => el.classList.remove('active'));
    const active = thumbGrid.querySelector(`[data-page="${pageIndex}"]`);
    if (active) {
      active.classList.add('active');
      if (thumbPanel.classList.contains('open')) {
        active.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
  }

  function preloadAround(pageNumber) {
    [pageNumber - 1, pageNumber + 1, pageNumber + 2, pageNumber + 3].forEach((n) => {
      if (n < 1 || n > TOTAL_PAGES) return;
      const src = pageSrc(n);
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }

  function haptic(pattern = 8) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function updateUI(pageIndex) {
    const visiblePage = Math.min(TOTAL_PAGES, pageIndex + 1);
    currentPageEl.textContent = String(visiblePage);
    prevBtn.disabled = pageIndex <= 0;
    nextBtn.disabled = pageIndex >= TOTAL_PAGES - 1;
    setActiveThumbnail(pageIndex);
    preloadAround(visiblePage);
    readingBar.style.width = `${(visiblePage / TOTAL_PAGES) * 100}%`;
    savePrefs({ lastPage: visiblePage, sound: audioEnabled });
    if (albumOpened) syncUrl(visiblePage, true);
  }

  function goToPageIndex(index, corner = 'top') {
    if (!pageFlip) return;
    const clamped = Math.max(0, Math.min(TOTAL_PAGES - 1, index));
    if (pageFlip.getCurrentPageIndex() === clamped) {
      updateUI(clamped);
      return;
    }
    pageFlip.flip(clamped, corner);
  }

  function goToPageNumber(pageNumber) {
    goToPageIndex(Math.max(1, Math.min(TOTAL_PAGES, Number(pageNumber) || 1)) - 1);
  }

  // ---------- Audio: theme music + soft page SFX ----------
  let audioContext = null;
  let masterGain = null;
  let musicStarted = false;

  if (themeMusic) {
    themeMusic.volume = MUSIC_VOLUME;
    themeMusic.loop = true;
    themeMusic.preload = 'auto';
  }

  function updateSoundButtons() {
    document.body.classList.toggle('sound-muted', !audioEnabled);
    soundBtn.setAttribute('aria-label', audioEnabled ? 'Mute music' : 'Unmute music');
    soundToggleIntro.setAttribute('aria-pressed', audioEnabled ? 'true' : 'false');
    soundToggleIntro.textContent = `Music: ${audioEnabled ? 'On' : 'Off'}`;
  }

  function ensureAudioReady() {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function startThemeMusic() {
    if (!themeMusic || !audioEnabled) return;
    themeMusic.volume = MUSIC_VOLUME;
    const playPromise = themeMusic.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          musicStarted = true;
        })
        .catch(() => {
          // Autoplay blocked until a later gesture — retry on next interaction
          musicStarted = false;
        });
    } else {
      musicStarted = true;
    }
  }

  function pauseThemeMusic() {
    if (!themeMusic) return;
    themeMusic.pause();
  }

  function syncMusicWithMute() {
    if (!themeMusic) return;
    if (audioEnabled) {
      themeMusic.volume = MUSIC_VOLUME;
      if (albumOpened) startThemeMusic();
    } else {
      pauseThemeMusic();
    }
  }

  function noiseBuffer(duration, decayPower = 2.2) {
    const ctx = audioContext;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decayPower);
    }
    return buffer;
  }

  function playNoiseBurst({
    duration = 0.22,
    volume = 0.05,
    hp = 500,
    lp = 4500,
    attack = 0.012,
    flutter = 0
  } = {}) {
    if (!audioEnabled || !ensureAudioReady()) return;
    const now = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer(duration, 2.4);
    const high = audioContext.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = hp;
    const low = audioContext.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = lp;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (flutter > 0) {
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.frequency.value = flutter;
      lfoGain.gain.value = volume * 0.35;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
      lfo.stop(now + duration);
    }

    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(masterGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function playTone({ freq = 440, duration = 0.2, volume = 0.03, type = 'sine', slideTo = null } = {}) {
    if (!audioEnabled || !ensureAudioReady()) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playPageTurn() {
    // Keep SFX quieter under the theme song
    playNoiseBurst({ duration: 0.28, volume: 0.035, hp: 380, lp: 5400, attack: 0.012, flutter: 8 });
    setTimeout(() => {
      playNoiseBurst({ duration: 0.12, volume: 0.018, hp: 850, lp: 3800, attack: 0.004 });
    }, 80);
  }

  function playIntroduction() {
    if (!audioEnabled || !ensureAudioReady()) return;
    const now = audioContext.currentTime;
    const drone = audioContext.createOscillator();
    const droneGain = audioContext.createGain();
    const droneFilter = audioContext.createBiquadFilter();
    drone.type = 'sine';
    drone.frequency.value = 110;
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 420;
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.028, now + 0.35);
    droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);
    drone.start(now);
    drone.stop(now + 1.9);

    playNoiseBurst({ duration: 0.45, volume: 0.03, hp: 160, lp: 2600, attack: 0.05 });
    setTimeout(() => playPageTurn(), 350);
  }

  function playOpenAlbum() {
    playIntroduction();
    startThemeMusic();
  }

  function playReadyChime() {
    playTone({ freq: 523.25, duration: 0.28, volume: 0.022, type: 'sine' });
    setTimeout(() => playTone({ freq: 659.25, duration: 0.36, volume: 0.018, type: 'sine' }), 90);
  }

  function playSoftClick() {
    playNoiseBurst({ duration: 0.05, volume: 0.015, hp: 1200, lp: 6000, attack: 0.002 });
  }

  function toggleSound() {
    audioEnabled = !audioEnabled;
    ensureAudioReady();
    updateSoundButtons();
    savePrefs({ sound: audioEnabled });
    syncMusicWithMute();
    if (audioEnabled) {
      playSoftClick();
      showToast('Music on · 40% volume');
    } else {
      showToast('Music muted');
    }
  }

  buildPages();
  buildThumbnails();
  updateSoundButtons();

  if (!window.St || !window.St.PageFlip) {
    bookEl.innerHTML =
      '<div class="library-error">The page-turn library could not load. Please refresh the page.</div>';
    openAlbumBtn.disabled = false;
    openAlbumBtn.textContent = 'Open Album';
    return;
  }

  const urlStart = parsePageFromUrl();
  const savedPage = Number(prefs.lastPage);
  const resumePage =
    Number.isFinite(savedPage) && savedPage >= 2 && savedPage <= TOTAL_PAGES ? savedPage : null;

  pendingStartPage = urlStart !== null ? urlStart : 0;

  pageFlip = new St.PageFlip(bookEl, {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    size: 'stretch',
    minWidth: 220,
    maxWidth: 920,
    minHeight: 170,
    maxHeight: 720,
    maxShadowOpacity: 0.55,
    showCover: true,
    mobileScrollSupport: false,
    usePortrait: true,
    startPage: pendingStartPage,
    drawShadow: true,
    flippingTime: NORMAL_FLIP_MS,
    clickEventForward: true,
    useMouseEvents: true,
    swipeDistance: window.matchMedia('(pointer: coarse)').matches ? 12 : 16,
    showPageCorners: !window.matchMedia('(max-width: 720px)').matches,
    disableFlipByClick: false,
    autoSize: true
  });

  pageFlip.loadFromHTML(document.querySelectorAll('.page'));
  updateUI(pageFlip.getCurrentPageIndex());

  pageFlip.on('flip', (event) => {
    updateUI(event.data);
    playPageTurn();
    haptic(10);
    if (slideshowActive) updateSlideshowBanner();
  });
  pageFlip.on('changeOrientation', () => {
    setTimeout(() => updateUI(pageFlip.getCurrentPageIndex()), 60);
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      try {
        pageFlip.update();
        updateUI(pageFlip.getCurrentPageIndex());
      } catch (_) {}
    }, 180);
  });

  function openAlbum(startIndex = null) {
    ensureAudioReady();
    if (startIndex !== null) {
      const clamped = Math.max(0, Math.min(TOTAL_PAGES - 1, startIndex));
      if (pageFlip.getCurrentPageIndex() !== clamped) pageFlip.turnToPage(clamped);
      updateUI(clamped);
    }
    playOpenAlbum();
    haptic([12, 30, 12]);
    openingScreen.classList.add('hidden');
    openingScreen.setAttribute('aria-hidden', 'true');
    albumOpened = true;
    syncUrl(pageFlip.getCurrentPageIndex() + 1, true);
    setBodyModalState();
    hintText.textContent = window.matchMedia('(pointer: coarse)').matches
      ? 'Swipe to turn • Tap page number to jump • Double-tap to zoom'
      : 'Drag corners or use arrows • Click page number to jump • Double-click to zoom';
  }

  if (resumePage && urlStart === null) {
    resumeAlbumBtn.hidden = false;
    resumePageLabel.textContent = String(resumePage);
  }

  prevBtn.addEventListener('click', () => {
    stopSlideshow();
    playSoftClick();
    pageFlip.flipPrev('top');
  });
  nextBtn.addEventListener('click', () => {
    stopSlideshow();
    playSoftClick();
    pageFlip.flipNext('top');
  });
  thumbsBtn.addEventListener('click', openThumbnails);
  pageCounter.addEventListener('click', openThumbnails);
  closeThumbsBtn.addEventListener('click', () => {
    playSoftClick();
    closeThumbnails();
  });
  scrim.addEventListener('click', () => {
    closeThumbnails();
    closeZoom();
  });

  jumpForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = Number(jumpInput.value);
    if (!Number.isFinite(value) || value < 1 || value > TOTAL_PAGES) {
      showToast(`Enter a page between 1 and ${TOTAL_PAGES}`);
      return;
    }
    playSoftClick();
    goToPageNumber(value);
    closeThumbnails();
  });

  fullscreenBtn.addEventListener('click', async () => {
    ensureAudioReady();
    playSoftClick();
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      showToast('Fullscreen is limited on this device — try Add to Home Screen');
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.setAttribute(
      'aria-label',
      document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'
    );
  });

  async function shareCurrentPage() {
    playSoftClick();
    const pageNumber = (pageFlip?.getCurrentPageIndex?.() ?? 0) + 1;
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(pageNumber));
    url.hash = '';
    const shareData = {
      title: "Lavanya's Seemantham",
      text: `Look at page ${pageNumber} of Lavanya's Seemantham digital album`,
      url: url.toString()
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast('Page link copied');
    } catch (_) {
      showToast(url.toString());
    }
  }
  shareBtn.addEventListener('click', shareCurrentPage);

  function setFlipSpeed(ms) {
    try {
      const settings = pageFlip.getSettings?.();
      if (settings) settings.flippingTime = ms;
    } catch (_) {}
  }

  function updateSlideshowBanner() {
    if (!slideshowBanner) return;
    if (!slideshowActive) {
      slideshowBanner.hidden = true;
      return;
    }
    slideshowBanner.hidden = false;
    const page = (pageFlip?.getCurrentPageIndex?.() ?? 0) + 1;
    slideshowStatus.textContent = `Page ${page} of ${TOTAL_PAGES}`;
  }

  function stopSlideshow({ silent = false } = {}) {
    const wasActive = slideshowActive;
    slideshowActive = false;
    clearTimeout(slideshowTimer);
    slideshowTimer = null;
    slideshowBtn.classList.remove('active');
    slideshowBtn.setAttribute('aria-pressed', 'false');
    slideshowBtn.setAttribute('aria-label', 'Start slideshow');
    document.body.classList.remove('slideshow-on');
    setFlipSpeed(NORMAL_FLIP_MS);
    updateSlideshowBanner();
    if (!silent && wasActive) showToast('Slideshow paused');
  }

  function scheduleNextSlide() {
    clearTimeout(slideshowTimer);
    if (!slideshowActive) return;
    slideshowTimer = setTimeout(() => {
      if (!slideshowActive || !pageFlip) return;
      const index = pageFlip.getCurrentPageIndex();
      if (index >= TOTAL_PAGES - 1) {
        stopSlideshow({ silent: true });
        showToast('Slideshow finished');
        playReadyChime();
        return;
      }
      // Alternate corner for a more natural cinematic turn
      const corner = index % 2 === 0 ? 'top' : 'bottom';
      pageFlip.flipNext(corner);
      updateSlideshowBanner();
      // Preload ahead during show
      preloadAround(index + 3);
      scheduleNextSlide();
    }, SLIDESHOW_MS);
  }

  function startSlideshow() {
    if (zoomViewer.classList.contains('open') || !openingScreen.classList.contains('hidden')) return;
    closeThumbnails();
    closeZoom();
    ensureAudioReady();
    startThemeMusic();

    // Begin from the start for a full cinematic experience if near the end
    const index = pageFlip.getCurrentPageIndex();
    if (index >= TOTAL_PAGES - 2) {
      pageFlip.turnToPage(0);
      updateUI(0);
    }

    slideshowActive = true;
    slideshowBtn.classList.add('active');
    slideshowBtn.setAttribute('aria-pressed', 'true');
    slideshowBtn.setAttribute('aria-label', 'Pause slideshow');
    document.body.classList.add('slideshow-on');
    setFlipSpeed(SLIDESHOW_FLIP_MS);
    updateSlideshowBanner();
    showToast('Slideshow playing with music');
    // Small beat before first auto-flip so the viewer settles
    clearTimeout(slideshowTimer);
    slideshowTimer = setTimeout(() => {
      if (!slideshowActive) return;
      const corner = 'top';
      if (pageFlip.getCurrentPageIndex() < TOTAL_PAGES - 1) pageFlip.flipNext(corner);
      scheduleNextSlide();
    }, reduceMotion ? 600 : 1600);
  }

  function toggleSlideshow() {
    if (slideshowActive) stopSlideshow();
    else startSlideshow();
  }
  slideshowBtn.addEventListener('click', () => {
    ensureAudioReady();
    playSoftClick();
    toggleSlideshow();
  });
  slideshowStopBtn?.addEventListener('click', () => {
    playSoftClick();
    stopSlideshow();
  });

  soundBtn.addEventListener('click', () => {
    ensureAudioReady();
    toggleSound();
  });
  soundToggleIntro.addEventListener('click', () => {
    ensureAudioReady();
    toggleSound();
  });

  // Keep music alive after unlock gestures (iOS)
  ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
    document.addEventListener(
      evt,
      () => {
        if (albumOpened && audioEnabled && themeMusic?.paused) startThemeMusic();
      },
      { passive: true }
    );
  });

  // ---------- Loading ritual ----------
  const LOADING_MESSAGES = [
    'Warming the cover',
    'Settling the pages',
    'Softening the paper',
    'Polishing the gold edges',
    'Almost ready to open'
  ];

  function preloadOpeningAssets() {
    let loaded = 0;
    let messageIndex = 0;
    const sources = [];
    for (let i = 1; i <= PRELOAD_PHOTOS; i += 1) sources.push(pageSrc(i));
    if (resumePage) sources.push(pageSrc(resumePage));
    if (urlStart !== null) sources.push(pageSrc(urlStart + 1));
    const unique = [...new Set(sources.filter(Boolean))];
    const total = Math.max(unique.length, 1);

    loadingStepTimer = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      if (!openingScreen.classList.contains('ready')) {
        loadingSteps.textContent = LOADING_MESSAGES[messageIndex];
      }
    }, 900);

    function finishReady() {
      openAlbumBtn.disabled = false;
      openAlbumBtn.querySelector('.btn-label').textContent =
        urlStart !== null ? `Open at page ${urlStart + 1}` : 'Open Album';
      loadingLabel.textContent = 'Your album is ready';
      loadingSteps.textContent = 'Tap Open Album to begin';
      openingScreen.classList.add('ready');
      clearInterval(loadingStepTimer);
    }

    function updateProgress() {
      const percent = Math.round((loaded / total) * 100);
      loadingPercent.textContent = `${percent}%`;
      loadingBar.style.width = `${percent}%`;
      if (loaded >= total) finishReady();
    }

    updateProgress();
    if (!unique.length) {
      finishReady();
      return;
    }
    unique.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded += 1;
        updateProgress();
      };
      img.src = src;
    });
  }

  openAlbumBtn.addEventListener('click', () => {
    openAlbum(urlStart !== null ? urlStart : pageFlip.getCurrentPageIndex());
  });
  resumeAlbumBtn.addEventListener('click', () => {
    openAlbum(resumePage - 1);
  });
  preloadOpeningAssets();
  setBodyModalState();

  // ---------- Zoom viewer ----------
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;
  let dragging = false;
  let lastTap = 0;
  const pointers = new Map();
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let zoomSpecialEl = null;

  function clampScale(value) {
    return Math.min(5, Math.max(1, value));
  }
  function applyZoom() {
    if (scale <= 1.001) {
      translateX = 0;
      translateY = 0;
    }
    const target = zoomSpecialEl || zoomImage;
    target.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
  }
  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyZoom();
  }
  function setZoom(nextScale) {
    scale = clampScale(nextScale);
    applyZoom();
  }

  function clearZoomSpecial() {
    if (zoomSpecialEl) {
      zoomSpecialEl.remove();
      zoomSpecialEl = null;
    }
    zoomImage.hidden = false;
  }

  function openZoom(pageNumber = pageFlip.getCurrentPageIndex() + 1) {
    stopSlideshow();
    playSoftClick();
    zoomPageNumber = Math.max(1, Math.min(TOTAL_PAGES, Number(pageNumber) || 1));
    clearZoomSpecial();
    zoomImage.src = pageSrc(zoomPageNumber);
    zoomImage.alt = `Lavanya's Seemantham album page ${zoomPageNumber}`;
    resetZoom();
    zoomViewer.classList.add('open');
    zoomViewer.setAttribute('aria-hidden', 'false');
    zoomPrevBtn.disabled = zoomPageNumber <= 1;
    zoomNextBtn.disabled = zoomPageNumber >= TOTAL_PAGES;
    setBodyModalState();
  }

  function closeZoom() {
    zoomViewer.classList.remove('open');
    zoomViewer.setAttribute('aria-hidden', 'true');
    clearZoomSpecial();
    resetZoom();
    pointers.clear();
    setBodyModalState();
  }

  function shiftZoomPage(delta) {
    const next = zoomPageNumber + delta;
    if (next < 1 || next > TOTAL_PAGES) return;
    openZoom(next);
    goToPageNumber(next);
  }

  zoomBtn.addEventListener('click', () => openZoom());
  zoomCloseBtn.addEventListener('click', () => {
    playSoftClick();
    closeZoom();
  });
  zoomInBtn.addEventListener('click', () => setZoom(scale + 0.35));
  zoomOutBtn.addEventListener('click', () => setZoom(scale - 0.35));
  zoomResetBtn.addEventListener('click', resetZoom);
  zoomPrevBtn.addEventListener('click', () => shiftZoomPage(-1));
  zoomNextBtn.addEventListener('click', () => shiftZoomPage(1));

  zoomViewer.addEventListener('click', (event) => {
    if (event.target.classList.contains('zoom-backdrop')) closeZoom();
  });

  zoomCanvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      setZoom(scale + (event.deltaY < 0 ? 0.18 : -0.18));
    },
    { passive: false }
  );

  function pointerDistance() {
    const values = [...pointers.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  zoomCanvas.addEventListener('pointerdown', (event) => {
    zoomCanvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const now = Date.now();
    if (now - lastTap < 300 && pointers.size === 1) {
      setZoom(scale > 1.2 ? 1 : 2.25);
      lastTap = 0;
      return;
    }
    lastTap = now;

    if (pointers.size === 2) {
      pinchStartDistance = pointerDistance();
      pinchStartScale = scale;
      dragging = false;
      zoomCanvas.classList.remove('dragging');
    } else if (scale > 1) {
      dragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragOriginX = translateX;
      dragOriginY = translateY;
      zoomCanvas.classList.add('dragging');
    }
  });

  zoomCanvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const distance = pointerDistance();
      if (pinchStartDistance > 0) setZoom(pinchStartScale * (distance / pinchStartDistance));
      return;
    }

    if (dragging && scale > 1) {
      translateX = dragOriginX + (event.clientX - dragStartX);
      translateY = dragOriginY + (event.clientY - dragStartY);
      applyZoom();
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStartDistance = 0;
    if (pointers.size === 0) {
      dragging = false;
      zoomCanvas.classList.remove('dragging');
    }
  }
  zoomCanvas.addEventListener('pointerup', endPointer);
  zoomCanvas.addEventListener('pointercancel', endPointer);

  bookEl.addEventListener('dblclick', (event) => {
    const page = event.target.closest?.('.page');
    if (page) openZoom(Number(page.dataset.pageNumber));
  });
  bookEl.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') return;
    const now = Date.now();
    const page = event.target.closest?.('.page');
    if (!page) return;
    const last = Number(page.dataset.lastTouch || 0);
    if (now - last < 320) openZoom(Number(page.dataset.pageNumber));
    page.dataset.lastTouch = String(now);
  });

  document.addEventListener('keydown', (event) => {
    const tag = (event.target && event.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable;

    if (!openingScreen.classList.contains('hidden') && event.key === 'Enter' && !openAlbumBtn.disabled && !typing) {
      openAlbumBtn.click();
      return;
    }
    if (zoomViewer.classList.contains('open')) {
      if (event.key === 'Escape') closeZoom();
      if (event.key === '+' || event.key === '=') setZoom(scale + 0.25);
      if (event.key === '-') setZoom(scale - 0.25);
      if (event.key === 'ArrowRight' || event.key === 'PageDown') shiftZoomPage(1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') shiftZoomPage(-1);
      return;
    }
    if (thumbPanel.classList.contains('open')) {
      if (event.key === 'Escape') closeThumbnails();
      return;
    }
    if (typing) return;
    if (openingScreen.classList.contains('hidden')) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        stopSlideshow();
        pageFlip.flipNext('top');
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        stopSlideshow();
        pageFlip.flipPrev('top');
      }
      if (event.key === 'Home') goToPageIndex(0);
      if (event.key === 'End') goToPageIndex(TOTAL_PAGES - 1);
      if (event.key.toLowerCase() === 's' && !event.metaKey && !event.ctrlKey) toggleSlideshow();
      if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey) fullscreenBtn.click();
    }
  });

  window.addEventListener('popstate', () => {
    const pageIndex = parsePageFromUrl();
    if (pageIndex !== null) goToPageIndex(pageIndex);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSlideshow({ silent: true });
      pauseThemeMusic();
    } else if (albumOpened && audioEnabled) {
      startThemeMusic();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=5').then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }
})();
